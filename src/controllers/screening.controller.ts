import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { redisDel, redisGet } from "../config/redis";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";
import { ApplicantModel } from "../models/Applicant.model";
import { addScreeningJob, getJobStatus } from "../services/queue.service";
import { generateExplanationsPDF, generateShortlistPDF } from "../services/export.service";
import { compareCandidatesWithGemini } from "../services/gemini.service";
import { notifyUser } from "../services/notification.service";

const toLowerSkills = (skills: unknown): string[] =>
  Array.isArray(skills) ? skills.map((s) => String(s).trim().toLowerCase()).filter(Boolean) : [];

const computeTransparencyScore = (candidate: {
  strengths?: string[];
  gaps?: string[];
  recommendation?: string;
  mustHaveSkillsMet?: string[];
  mustHaveSkillsMissing?: string[];
  aiConfidenceScore?: number;
}): number => {
  const strengthsScore = Math.min((candidate.strengths?.length ?? 0) * 15, 45);
  const gapsScore = (candidate.gaps?.length ?? 0) >= 1 ? 15 : 0;
  const recommendationScore = (candidate.recommendation?.trim().length ?? 0) >= 30 ? 20 : 10;
  const mustHaveCoverage = (candidate.mustHaveSkillsMet?.length ?? 0) + (candidate.mustHaveSkillsMissing?.length ?? 0) > 0 ? 10 : 0;
  const confidenceScore = Math.min(Math.max(candidate.aiConfidenceScore ?? 0, 0), 100) * 0.1;
  return Math.round(Math.min(strengthsScore + gapsScore + recommendationScore + mustHaveCoverage + confidenceScore, 100));
};

const buildWhyNotShortlisted = (profile: Record<string, unknown>, requiredSkills: string[], minYearsExperience: number): string[] => {
  const skills = toLowerSkills(profile.skills);
  const missingSkills = requiredSkills.filter((skill) => !skills.includes(skill.toLowerCase()));
  const totalYears = Number(profile.totalYearsExperience ?? 0);
  const reasons: string[] = [];

  if (missingSkills.length > 0) {
    reasons.push(`Missing required skills: ${missingSkills.slice(0, 3).join(", ")}.`);
  }
  if (totalYears < minYearsExperience) {
    reasons.push(`Experience gap: ${totalYears} years vs required ${minYearsExperience} years.`);
  }
  if (reasons.length === 0) {
    reasons.push("Lower overall alignment compared to shortlisted candidates.");
  }
  return reasons.slice(0, 2);
};

const buildScreeningExplanationsData = async (
  screeningId: string,
  recruiterId: string | undefined,
): Promise<{
  screeningId: string;
  jobId: string;
  jobTitle: string;
  shortlistExplanations: Array<Record<string, unknown>>;
  rejectedCandidateInsights: Array<Record<string, unknown>>;
  generatedAt: string;
}> => {
  const screening = await ScreeningModel.findOne({ _id: screeningId, recruiterId }).lean();
  if (!screening) {
    throw new Error("Screening not found for this recruiter.");
  }
  if (!screening.results) {
    throw new Error("Screening results are not ready yet.");
  }

  const job = await JobModel.findById(screening.jobId).lean();
  if (!job) {
    throw new Error("Associated job not found.");
  }

  const applicants = await ApplicantModel.find({ screeningId }).lean();
  const applicantByCandidateId = new Map<string, Record<string, unknown>>();
  applicants.forEach((applicant) => {
    const profile = applicant.profile as Record<string, unknown>;
    applicantByCandidateId.set(String(profile.id ?? ""), profile);
  });

  const shortlisted = screening.results.shortlist.map((candidate: Record<string, unknown>) => {
    const profile = applicantByCandidateId.get(String(candidate.candidateId)) ?? {};
    const firstName = String(profile.firstName ?? "Unknown");
    const lastName = String(profile.lastName ?? "Candidate");

    return {
      candidateId: candidate.candidateId,
      candidateName: `${firstName} ${lastName}`.trim(),
      rank: candidate.rank,
      totalScore: candidate.totalScore,
      transparencyScore: computeTransparencyScore(candidate),
      strengths: candidate.strengths,
      gaps: candidate.gaps,
      recommendation: candidate.recommendation,
      mustHaveSkillsMet: candidate.mustHaveSkillsMet,
      mustHaveSkillsMissing: candidate.mustHaveSkillsMissing,
      estimatedOnboardingTime: candidate.estimatedOnboardingTime,
      aiConfidenceScore: candidate.aiConfidenceScore,
    };
  });

  const shortlistedIds = new Set(shortlisted.map((item) => String(item.candidateId)));
  const rejected = applicants
    .filter((applicant) => applicant.status === "rejected")
    .map((applicant) => applicant.profile as Record<string, unknown>)
    .filter((profile) => !shortlistedIds.has(String(profile.id ?? "")))
    .map((profile) => ({
      candidateId: String(profile.id ?? ""),
      candidateName: `${String(profile.firstName ?? "Unknown")} ${String(profile.lastName ?? "Candidate")}`.trim(),
      whyNotShortlisted: buildWhyNotShortlisted(
        profile,
        Array.isArray(job.requirements?.mustHaveSkills) ? job.requirements.mustHaveSkills : [],
        Number(job.requirements?.minYearsExperience ?? 0),
      ),
    }));

  return {
    screeningId,
    jobId: String(screening.jobId),
    jobTitle: job.title,
    shortlistExplanations: shortlisted,
    rejectedCandidateInsights: rejected,
    generatedAt: new Date().toISOString(),
  };
};

export const runScreening = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = z.object({ jobId: z.string(), shortlistSize: z.union([z.literal(10), z.literal(20)]) }).parse(request.body);
  const job = await JobModel.findOne({ _id: body.jobId, recruiterId: request.user?.userId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });
  const count = await ApplicantModel.countDocuments({ jobId: body.jobId, status: "pending" });
  if (count < body.shortlistSize) return void reply.code(400).send({ error: "Not enough applicants" });
  const active = await ScreeningModel.findOne({ jobId: body.jobId, status: { $in: ["queued", "running"] } }).lean();
  if (active) return void reply.code(400).send({ error: "Active screening already exists" });

  const screening = await ScreeningModel.create({ jobId: body.jobId, recruiterId: request.user?.userId, status: "queued", shortlistSize: body.shortlistSize });
  const qJob = await addScreeningJob({ screeningId: String(screening._id), jobId: body.jobId, shortlistSize: body.shortlistSize, recruiterId: request.user?.userId ?? "" });
  await ScreeningModel.findByIdAndUpdate(screening._id, { queueJobId: String(qJob.id) });
  if (request.user?.userId) {
    await notifyUser({
      userId: request.user.userId,
      title: "Screening queued",
      message: `Screening ${String(screening._id)} started in background.`,
      type: "info",
      sendEmail: true,
    });
  }
  reply.send({ screeningId: screening._id, status: "queued", message: "Screening started" });
};

export const getScreening = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const cache = await redisGet(`screening:${id}`);
  if (cache) return void reply.send(JSON.parse(cache));
  const screening = await ScreeningModel.findById(id).lean();
  if (!screening) return void reply.code(404).send({ error: "Screening not found" });
  reply.send(screening);
};

export const screeningStatus = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const screening = await ScreeningModel.findById(id).lean();
  if (!screening) return void reply.code(404).send({ error: "Screening not found" });
  const queue = screening.queueJobId ? await getJobStatus(screening.queueJobId) : { state: screening.status };
  reply.send({ screeningId: id, status: screening.status, progress: queue.progress, estimatedTimeRemaining: null });
};

export const screeningHistoryByJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { jobId } = request.params as { jobId: string };
  const list = await ScreeningModel.find({ jobId }).sort({ createdAt: -1 }).lean();
  reply.send(list);
};

export const exportScreening = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const screening = await ScreeningModel.findById(id).lean();
  if (!screening?.results) return void reply.code(404).send({ error: "Completed screening not found" });
  const job = await JobModel.findById(screening.jobId).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });
  const buffer = await generateShortlistPDF(screening.results, { title: job.title });
  reply.header("Content-Type", "application/pdf").header("Content-Disposition", `attachment; filename=shortlist-${id}.pdf`).send(buffer);
};

export const deleteScreening = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const screening = await ScreeningModel.findById(id).lean();
  if (!screening) return void reply.code(404).send({ error: "Not found" });
  if (!["completed", "failed"].includes(screening.status)) return void reply.code(400).send({ error: "Cannot delete in-progress screening" });
  await Promise.all([ScreeningModel.findByIdAndDelete(id), redisDel(`screening:${id}`)]);
  reply.send({ deleted: true });
};

export const compareCandidates = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = z.object({ candidateIds: z.array(z.string()).min(2).max(5) }).parse(request.body);
  const { id } = request.params as { id: string };
  const screening = await ScreeningModel.findById(id).lean();
  if (!screening?.results) return void reply.code(404).send({ error: "Screening not found" });
  const candidates = screening.results.shortlist.filter((c: { candidateId: string }) => body.candidateIds.includes(c.candidateId));
  const comparison = await compareCandidatesWithGemini(candidates);
  reply.send(comparison);
};

export const screeningExplanations = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  try {
    const data = await buildScreeningExplanationsData(id, request.user?.userId);
    reply.send({
      success: true,
      message: "Screening explanations generated successfully.",
      data,
    });
  } catch (error) {
    const message = String((error as Error).message ?? "");
    if (message.includes("not found")) {
      return void reply.code(404).send({ success: false, error: message });
    }
    if (message.includes("not ready")) {
      return void reply.code(400).send({ success: false, error: message });
    }
    return void reply.code(500).send({ success: false, error: "Unable to generate screening explanations." });
  }
};

export const exportScreeningExplanations = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  try {
    const data = await buildScreeningExplanationsData(id, request.user?.userId);
    const buffer = await generateExplanationsPDF({
      screeningId: data.screeningId,
      jobId: data.jobId,
      jobTitle: data.jobTitle,
      shortlistExplanations: data.shortlistExplanations as Array<{
        candidateId: string;
        candidateName: string;
        rank: number;
        totalScore: number;
        transparencyScore: number;
        strengths: string[];
        gaps: string[];
        recommendation: string;
        mustHaveSkillsMet: string[];
        mustHaveSkillsMissing: string[];
        estimatedOnboardingTime: string;
        aiConfidenceScore: number;
      }>,
      rejectedCandidateInsights: data.rejectedCandidateInsights as Array<{
        candidateId: string;
        candidateName: string;
        whyNotShortlisted: string[];
      }>,
      generatedAt: data.generatedAt,
    });
    reply
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", `attachment; filename=screening-explanations-${id}.pdf`)
      .send(buffer);
  } catch (error) {
    const message = String((error as Error).message ?? "");
    if (message.includes("not found")) {
      return void reply.code(404).send({ success: false, error: message });
    }
    if (message.includes("not ready")) {
      return void reply.code(400).send({ success: false, error: message });
    }
    return void reply.code(500).send({ success: false, error: "Unable to export screening explanations." });
  }
};
