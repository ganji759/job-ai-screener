import type { FastifyReply, FastifyRequest } from "fastify";
import { Types } from "mongoose";
import { z } from "zod";
import { redisDel, redisGet, redisSet } from "../config/redis";
import { JobModel } from "../models/Job.model";
import { ScreeningModel } from "../models/Screening.model";
import { ApplicantModel } from "../models/Applicant.model";
import { addScreeningJob, getJobStatus } from "../services/queue.service";
import { generateExplanationsPDF, generateShortlistPDF } from "../services/export.service";
import { compareCandidatesWithGemini, generatePlainText, generatePoolInsights, scoreAllCandidates } from "../services/gemini.service";
import {
  leanJobToJobRequirements,
  screenFromUmuravaPlatformJob,
} from "../services/screening.service";
import type { CandidateResult, PlatformCandidateResult, UmuravaProfile } from "../types";
import { notifyUser } from "../services/notification.service";
import {
  mergeRecruiterDecisionRecords,
  scheduleAutoRejectionEmails,
  SendAcceptanceEmailsBodySchema,
  sendAcceptanceEmailsForScreening,
} from "../services/screening-outreach.service";

const RecruiterDecisionEntrySchema = z.object({
  decision: z.enum(["approved", "rejected", "review"]),
  hrNote: z.string().default(""),
  decidedAt: z.string().optional(),
  aiLabel: z.string().optional(),
});

const RecruiterDecisionsBodySchema = z.record(z.string(), RecruiterDecisionEntrySchema);

/** Mongoose may return a Map or plain object for Mixed / Map fields. */
const plainRecruiterDecisions = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== "object") return {};
  if (raw instanceof Map) return Object.fromEntries(raw.entries());
  return { ...(raw as Record<string, unknown>) };
};

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

const executeRunScreening = async (
  request: FastifyRequest,
  reply: FastifyReply,
  jobId: string,
  shortlistSize: 10 | 20,
): Promise<void> => {
  const job = await JobModel.findOne({ _id: jobId, recruiterId: request.user?.userId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });
  const count = await ApplicantModel.countDocuments({ jobId, status: "pending" });
  if (count < shortlistSize) return void reply.code(400).send({ error: "Not enough applicants" });
  const active = await ScreeningModel.findOne({ jobId, status: { $in: ["queued", "running"] } }).lean();
  if (active) return void reply.code(400).send({ error: "Active screening already exists" });

  const screening = await ScreeningModel.create({ jobId, recruiterId: request.user?.userId, status: "queued", shortlistSize });
  const qJob = await addScreeningJob({ screeningId: String(screening._id), jobId, shortlistSize, recruiterId: request.user?.userId ?? "" });
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

/** POST /api/v1/jobs/:jobId/screenings — body optional `{ shortlistSize?: 10 | 20 }`, defaults to 10. */
export const runScreeningForJob = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { jobId } = request.params as { jobId: string };
  const parsed = z.object({ shortlistSize: z.union([z.literal(10), z.literal(20)]).optional() }).safeParse(request.body ?? {});
  const shortlistSize = (parsed.success ? parsed.data.shortlistSize ?? 10 : 10) as 10 | 20;
  return executeRunScreening(request, reply, jobId, shortlistSize);
};

export const runScreening = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const body = z.object({ jobId: z.string(), shortlistSize: z.union([z.literal(10), z.literal(20)]) }).parse(request.body);
  return executeRunScreening(request, reply, body.jobId, body.shortlistSize);
};

const mapRecommendationBadge = (text: string): string => {
  const t = text.toLowerCase();
  if ((t.includes("strong") && t.includes("yes")) || t.includes("strong yes")) return "Strong Yes";
  if (t.includes("maybe") || t.includes("consider")) return "Maybe";
  if (t.includes("not recommended") || (t.includes("no") && !t.includes("know"))) return "No";
  if (t.includes("yes") || t.includes("recommended") || t.includes("hire")) return "Yes";
  return text.trim().slice(0, 120) || "Maybe";
};

/**
 * Synchronous screening (no Redis queue): scores pending applicants matching `applicantExtraFilter`,
 * persists a completed Screening document, updates applicant statuses, caches payload.
 */
const persistSyncScreening = async (
  request: FastifyRequest,
  reply: FastifyReply,
  opts: { jobId: string; shortlistSize: 10 | 20; applicantExtraFilter: Record<string, unknown> },
): Promise<void> => {
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });

  const job = await JobModel.findOne({ _id: opts.jobId, recruiterId }).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });

  const applicants = await ApplicantModel.find({ jobId: opts.jobId, ...opts.applicantExtraFilter }).lean();
  if (!applicants.length) {
    return void reply.code(400).send({ error: "No applicants eligible for screening. Upload candidates first, or check that they have not all been shortlisted in a previous run." });
  }

  const normalizedRequirements = leanJobToJobRequirements(job as Parameters<typeof leanJobToJobRequirements>[0]);
  const candidates = applicants.map((a) => a.profile as UmuravaProfile);
  const started = Date.now();
  let results: Awaited<ReturnType<typeof scoreAllCandidates>>;
  try {
    results = await scoreAllCandidates(normalizedRequirements, candidates);
  } catch (scoringErr) {
    const message = scoringErr instanceof Error ? scoringErr.message : "AI scoring failed";
    return void reply.code(500).send({ error: "Screening failed", message });
  }
  if (results.length === 0) {
    return void reply.code(500).send({ error: "Screening failed", message: "AI scoring returned no results. Check your Gemini API key and model configuration." });
  }
  const shortlist = results.slice(0, opts.shortlistSize);
  const insights = await generatePoolInsights(normalizedRequirements, results);

  const screeningDoc = await ScreeningModel.create({
    jobId: opts.jobId,
    recruiterId,
    status: "running",
    shortlistSize: opts.shortlistSize,
    pipeline: "external_upload_sync",
  });
  const screeningId = String(screeningDoc._id);

  const payload = {
    screeningKind: "external_upload_sync",
    screeningId,
    jobId: opts.jobId,
    status: "completed" as const,
    shortlistSize: opts.shortlistSize,
    allResults: results,
    shortlist,
    totalAnalyzed: results.length,
    averageScore: insights.averageScore,
    scoreDistribution: insights.scoreDistribution,
    topSkillsFound: insights.topSkillsFound,
    skillGapsInPool: insights.skillGapsInPool,
    durationMs: Date.now() - started,
    createdAt: new Date(),
  };

  await ScreeningModel.findByIdAndUpdate(screeningId, { status: "completed", results: payload, durationMs: payload.durationMs });

  const poolIds = applicants.map((a) => a._id);
  const shortlistIds = new Set(shortlist.map((s) => s.candidateId));
  await ApplicantModel.updateMany(
    { _id: { $in: poolIds }, "profile.id": { $in: [...shortlistIds] } },
    { status: "shortlisted", screeningId },
  );
  await ApplicantModel.updateMany(
    { _id: { $in: poolIds }, "profile.id": { $nin: [...shortlistIds] } },
    { status: "rejected", screeningId },
  );

  await redisSet(`screening:${screeningId}`, JSON.stringify(payload), 3600);

  if (request.user?.userId) {
    await notifyUser({
      userId: request.user.userId,
      title: "Screening completed",
      message: `Screening ${screeningId} completed. ${shortlist.length} candidates shortlisted.`,
      type: "success",
      sendEmail: true,
    });
  }

  reply.send({ screeningId, status: "completed", message: "Screening completed" });
};

const isPlatformShortlistEntry = (x: unknown): x is PlatformCandidateResult =>
  typeof x === "object" &&
  x !== null &&
  "scoreBreakdown" in x &&
  "reasoning" in x &&
  typeof (x as PlatformCandidateResult).scoreBreakdown === "object" &&
  typeof (x as PlatformCandidateResult).reasoning === "object";

/** Persists Scenario 1 — Umurava platform AI screening (35/25/15/15/10 rubric, Gemini). */
const persistUmuravaPlatformScreening = async (
  request: FastifyRequest,
  reply: FastifyReply,
  opts: { jobId: string; shortlistSize: 10 | 20 },
): Promise<void> => {
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });

  const started = Date.now();
  let data: Awaited<ReturnType<typeof screenFromUmuravaPlatformJob>>;
  try {
    data = await screenFromUmuravaPlatformJob({
      jobId: opts.jobId,
      recruiterId,
      shortlistSize: opts.shortlistSize,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Umurava platform screening failed";
    request.log.error({ err }, "screenFromUmuravaPlatformJob failed");
    return void reply.code(500).send({
      error: "Screening failed",
      message,
    });
  }

  const { allResults, shortlist, insights, applicantsInPool } = data;

  const screeningDoc = await ScreeningModel.create({
    jobId: opts.jobId,
    recruiterId,
    status: "running",
    shortlistSize: opts.shortlistSize,
    pipeline: "umurava_platform_ai",
    totalEvaluated: allResults.length,
    averageScore: insights.averageScore,
  });
  const screeningId = String(screeningDoc._id);

  const payload = {
    screeningKind: "umurava_platform_ai",
    screeningId,
    jobId: opts.jobId,
    status: "completed" as const,
    shortlistSize: opts.shortlistSize,
    topN: opts.shortlistSize,
    allResults,
    shortlist,
    totalAnalyzed: allResults.length,
    totalEvaluated: allResults.length,
    averageScore: insights.averageScore,
    scoreDistribution: insights.scoreDistribution,
    topSkillsFound: insights.topSkillsFound,
    skillGapsInPool: insights.skillGapsInPool,
    durationMs: Date.now() - started,
    createdAt: new Date(),
  };

  await ScreeningModel.findByIdAndUpdate(screeningId, {
    status: "completed",
    results: payload,
    durationMs: payload.durationMs,
    totalEvaluated: allResults.length,
    averageScore: insights.averageScore,
  });

  const poolIds = applicantsInPool.map((a) => a._id);
  const shortlistIds = new Set(shortlist.map((s) => s.candidateId));
  await ApplicantModel.updateMany(
    { _id: { $in: poolIds }, "profile.id": { $in: [...shortlistIds] } },
    { status: "shortlisted", screeningId },
  );
  await ApplicantModel.updateMany(
    { _id: { $in: poolIds }, "profile.id": { $nin: [...shortlistIds] } },
    { status: "rejected", screeningId },
  );

  await redisSet(`screening:${screeningId}`, JSON.stringify(payload), 3600);

  if (request.user?.userId) {
    await notifyUser({
      userId: request.user.userId,
      title: "Screening completed",
      message: `Screening ${screeningId} completed. ${shortlist.length} candidates shortlisted.`,
      type: "success",
      sendEmail: true,
    });
  }

  reply.send({ screeningId, status: "completed", message: "Screening completed" });
};

const PlatformScreeningBodySchema = z
  .object({
    jobId: z.string().min(1, "jobId must be a non-empty string"),
    recruiterId: z.string().optional(),
    shortlistSize: z.union([z.literal(10), z.literal(20)]).optional(),
    topN: z.union([z.literal(10), z.literal(20)]).optional(),
  })
  .strip();

/** POST /api/v1/screenings/platform — Umurava DB profiles only (`umurava_platform`, pending). Body matches frontend: `{ jobId, topN | shortlistSize, recruiterId? }`. */
export const syncPlatformScreening = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  request.log.info({ body: request.body }, "POST /screenings/platform body");
  const parsed = PlatformScreeningBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return void reply.code(400).send({
      error: "Invalid request body",
      message: "Expected jobId (string) and shortlist size as shortlistSize or topN (10 | 20). recruiterId is optional (ignored; auth token is used).",
      fieldErrors: flat.fieldErrors,
      formErrors: flat.formErrors,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const shortlistSize = (parsed.data.shortlistSize ?? parsed.data.topN ?? 10) as 10 | 20;
  try {
    await persistUmuravaPlatformScreening(request, reply, { jobId: parsed.data.jobId, shortlistSize });
  } catch (err) {
    request.log.error({ err }, "syncPlatformScreening");
    const message = err instanceof Error ? err.message : "Screening failed";
    if (!reply.sent) {
      reply.code(500).send({ error: "Screening failed", message });
    }
  }
};

/**
 * POST /api/v1/screenings/run-for-job — one-click screening for a single job.
 *
 * Screens ALL pending applicants for the job regardless of source (umurava_platform,
 * csv_upload, pdf_upload). Designed for the "Run AI Screening" button on the job's
 * Screenings/Applicants pages where the recruiter has a job in scope and just wants
 * results without picking a scenario.
 *
 * Body: `{ jobId: string, shortlistSize?: 10 | 20 }` — defaults to 10.
 */
export const runScreeningForJobAllSources = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const parsed = z
    .object({
      jobId: z.string().min(1, "jobId is required"),
      shortlistSize: z.union([z.literal(10), z.literal(20)]).optional(),
    })
    .strip()
    .safeParse(request.body ?? {});
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return void reply.code(400).send({
      error: "Invalid request body",
      message: "Expected { jobId: string, shortlistSize?: 10 | 20 }.",
      fieldErrors: flat.fieldErrors,
    });
  }
  const shortlistSize = (parsed.data.shortlistSize ?? 10) as 10 | 20;
  try {
    await persistSyncScreening(request, reply, {
      jobId: parsed.data.jobId,
      shortlistSize,
      // Include rejected applicants so re-runs work after a failed screening.
      // Shortlisted applicants are excluded — they are already in a completed shortlist.
      applicantExtraFilter: { status: { $in: ["pending", "rejected"] } },
    });
  } catch (err) {
    request.log.error({ err }, "runScreeningForJobAllSources");
    if (!reply.sent) {
      reply.code(500).send({
        error: "Screening failed",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
};

/** POST /api/v1/screenings/external — uploads only (`csv_upload` / `pdf_upload`), pending. */
export const syncExternalScreening = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  request.log.info({ body: request.body }, "POST /screenings/external body");
  const parsed = PlatformScreeningBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return void reply.code(400).send({
      error: "Invalid request body",
      message: "Expected jobId (string) and shortlist size as shortlistSize or topN (10 | 20).",
      fieldErrors: flat.fieldErrors,
      formErrors: flat.formErrors,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  const shortlistSize = (parsed.data.shortlistSize ?? parsed.data.topN ?? 10) as 10 | 20;
  try {
    await persistSyncScreening(request, reply, {
      jobId: parsed.data.jobId,
      shortlistSize,
      applicantExtraFilter: { source: { $in: ["csv_upload", "pdf_upload"] }, status: "pending" },
    });
  } catch (err) {
    request.log.error({ err }, "syncExternalScreening");
    reply.code(400).send({ error: err instanceof Error ? err.message : "Screening failed" });
  }
};

/** GET /api/v1/screenings — list screenings for the authenticated recruiter (newest first). */
export const listScreenings = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });
  const list = await ScreeningModel.find({ recruiterId }).sort({ createdAt: -1 }).lean();
  const jobIds = [...new Set(list.map((s) => String(s.jobId)))];
  const jobs = await JobModel.find({ _id: { $in: jobIds } }).lean();
  const jobById = new Map(jobs.map((j) => [String(j._id), j]));

  const payload = list.map((s) => {
    const job = jobById.get(String(s.jobId));
    const results = s.results as
      | {
          totalAnalyzed?: number;
          totalEvaluated?: number;
          averageScore?: number;
          shortlist?: unknown[];
          topSkillsFound?: string[];
          skillGapsInPool?: string[];
        }
      | undefined;
    const displayStatus = s.status === "queued" || s.status === "running" ? "running" : s.status === "failed" ? "failed" : "completed";
    return {
      _id: String(s._id),
      jobId: String(s.jobId),
      jobTitle: job?.title ?? "Unknown job",
      jobDomain: String(job?.requirements?.domain ?? ""),
      status: s.status,
      displayStatus,
      totalAnalyzed: results?.totalEvaluated ?? results?.totalAnalyzed ?? s.totalEvaluated ?? 0,
      shortlistedCount: Array.isArray(results?.shortlist) ? results.shortlist.length : 0,
      averageScore: results?.averageScore ?? 0,
      createdAt: s.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: s.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      durationMs: s.durationMs,
      results: results
        ? {
            shortlist: results.shortlist,
            averageScore: results.averageScore ?? 0,
            topSkillsFound: results.topSkillsFound ?? [],
            skillGapsInPool: results.skillGapsInPool ?? [],
          }
        : undefined,
    };
  });

  reply.send(payload);
};

/**
 * PUT /api/v1/screenings/:id/recruiter-decisions — merge HR decisions (per applicant id).
 * Body: `{ [applicantMongoId]: { decision, hrNote, decidedAt?, aiLabel? } }`
 */
export const saveRecruiterDecisions = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const recruiterId = request.user?.userId;
  if (!recruiterId || !Types.ObjectId.isValid(recruiterId)) {
    return void reply.code(401).send({ error: "Unauthorized" });
  }
  const { id } = request.params as { id: string };
  if (!Types.ObjectId.isValid(id)) {
    return void reply.code(400).send({ error: "Invalid screening id" });
  }
  const parsed = RecruiterDecisionsBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first ? `${String(first.path[0] ?? "body")}: ${first.message}` : "Invalid request body";
    return void reply.code(400).send({ error: "Invalid body", message, details: parsed.error.issues });
  }
  // Match the same { _id, recruiterId } filter shape as getScreeningResults (string ids; let Mongoose cast to ObjectId).
  const screening = await ScreeningModel.findOne({ _id: id, recruiterId });
  if (!screening) {
    return void reply.code(404).send({ error: "Screening not found" });
  }
  if (screening.status !== "completed") {
    return void reply.code(400).send({ error: "Can only record decisions on a completed screening" });
  }

  const current = plainRecruiterDecisions(screening.get("recruiterDecisions"));
  const merged = mergeRecruiterDecisionRecords(current, parsed.data);
  // Mixed fields are not always persisted by `save()`; `$set` always writes the document.
  const upd = await ScreeningModel.updateOne(
    { _id: id, recruiterId },
    { $set: { recruiterDecisions: merged } },
  );
  if (upd.matchedCount === 0) {
    return void reply.code(404).send({ error: "Screening not found" });
  }
  await redisDel(`screening:${id}`);

  const job = await JobModel.findById(screening.jobId).lean();
  if (job) {
    scheduleAutoRejectionEmails({
      screeningId: id,
      jobId: screening.jobId,
      jobTitle: String(job.title ?? "the role"),
      previousMerged: current,
      incoming: parsed.data,
    });
  }

  reply.send({ success: true, recruiterDecisions: merged });
};

/**
 * POST /api/v1/screenings/:id/send-acceptance-emails — email all HR-approved shortlisted candidates.
 * Body: `{ message: string, subject?: string }`
 */
export const sendAcceptanceEmails = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const recruiterId = request.user?.userId;
  if (!recruiterId || !Types.ObjectId.isValid(recruiterId)) {
    return void reply.code(401).send({ error: "Unauthorized" });
  }
  const { id } = request.params as { id: string };
  if (!Types.ObjectId.isValid(id)) {
    return void reply.code(400).send({ error: "Invalid screening id" });
  }
  const parsed = SendAcceptanceEmailsBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first ? `${String(first.path[0] ?? "body")}: ${first.message}` : "Invalid request body";
    return void reply.code(400).send({ error: "Invalid body", message, details: parsed.error.issues });
  }
  try {
    const result = await sendAcceptanceEmailsForScreening({
      screeningId: id,
      recruiterId,
      body: parsed.data,
    });
    reply.send({ success: true, ...result });
  } catch (err) {
    const code = String((err as Error)?.message ?? "");
    if (code === "SCREENING_INVALID") {
      return void reply.code(404).send({ error: "Screening not found or not complete" });
    }
    if (code === "NO_SHORTLIST") {
      return void reply.code(400).send({ error: "No shortlist for this screening" });
    }
    if (code === "JOB_NOT_FOUND") {
      return void reply.code(404).send({ error: "Job not found" });
    }
    throw err;
  }
};

/** GET /api/v1/screenings/:id/results — ranked shortlist shaped for the Next.js dashboard (`ranked`, legacy applicant envelope). */
export const getScreeningResults = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });

  const screening = await ScreeningModel.findOne({ _id: id, recruiterId }).lean();
  if (!screening) return void reply.code(404).send({ error: "Screening not found" });
  if (screening.status !== "completed") {
    return void reply.code(400).send({ error: "Screening not complete" });
  }

  const stored = screening.results as
    | { shortlist?: unknown[]; totalAnalyzed?: number; totalEvaluated?: number }
    | undefined;
  const shortlist = stored?.shortlist;
  if (!Array.isArray(shortlist) || shortlist.length === 0) {
    return void reply.code(404).send({ error: "No results" });
  }

  const jobIdStr = String(screening.jobId);
  const applicants = await ApplicantModel.find({ jobId: screening.jobId }).lean();
  const byCandidateId = new Map<string, (typeof applicants)[number]>();
  applicants.forEach((a) => {
    const pid = String((a.profile as { id?: string }).id ?? a._id);
    byCandidateId.set(pid, a);
  });

  const mapLegacyRow = (cr: CandidateResult) => {
    const app = byCandidateId.get(String(cr.candidateId));
    const profile = (app?.profile ?? {}) as Record<string, unknown>;
    const firstName = String(profile.firstName ?? "Unknown");
    const lastName = String(profile.lastName ?? "");
    const email = String(profile.email ?? "");
    const skillsRaw = profile.skills;
    const skills = Array.isArray(skillsRaw) ? skillsRaw.map((s) => String(s)) : [];
    const edu = profile.education;
    let educationSummary = "";
    if (typeof edu === "string") educationSummary = edu;
    else if (Array.isArray(edu) && edu[0] && typeof edu[0] === "object") {
      const e0 = edu[0] as Record<string, unknown>;
      educationSummary = [e0.degree, e0.institution].filter(Boolean).join(" · ");
    }

    const srcRaw = String(app?.source ?? "umurava_platform");
    const legacySource =
      srcRaw === "csv_upload" ? ("upload_csv" as const) : srcRaw === "pdf_upload" ? ("resume_pdf" as const) : ("umurava_platform" as const);

    return {
      rank: cr.rank,
      screening_kind: "legacy" as const,
      applicant: {
        _id: String(app?._id ?? cr.candidateId),
        job_id: jobIdStr,
        source: legacySource,
        parsed_profile: {
          name: `${firstName} ${lastName}`.trim() || "Unknown Candidate",
          email,
          skills,
          experience_years: Number(profile.totalYearsExperience ?? 0),
          education: educationSummary,
          summary: String(profile.summary ?? ""),
        },
      },
      composite_score: cr.totalScore,
      score_breakdown_points: undefined,
      dimension_scores: {
        skills: cr.breakdown.skillsMatch,
        experience: cr.breakdown.experienceMatch,
        education: cr.breakdown.educationMatch,
        cultural_fit: cr.breakdown.culturalFit,
        additional_assets: 0,
      },
      strengths: cr.strengths,
      gaps: cr.gaps,
      recommendation: mapRecommendationBadge(cr.recommendation),
      reasoning_detail: undefined as
        | { relevanceSummary: string; recommendation: string; hiringRisk: string }
        | undefined,
    };
  };

  const ranked = shortlist.map((entry: unknown) => {
    if (isPlatformShortlistEntry(entry)) {
      const cr = entry;
      const app = byCandidateId.get(String(cr.candidateId));
      const profile = (app?.profile ?? {}) as Record<string, unknown>;
      const firstName = String(profile.firstName ?? "Unknown");
      const lastName = String(profile.lastName ?? "");
      const email = String(profile.email ?? "");
      const skillsRaw = profile.skills;
      const skills = Array.isArray(skillsRaw) ? skillsRaw.map((s) => String(s)) : [];
      const edu = profile.education;
      let educationSummary = "";
      if (typeof edu === "string") educationSummary = edu;
      else if (Array.isArray(edu) && edu[0] && typeof edu[0] === "object") {
        const e0 = edu[0] as Record<string, unknown>;
        educationSummary = [e0.degree, e0.institution].filter(Boolean).join(" · ");
      }
      const b = cr.scoreBreakdown;
      return {
        rank: cr.rank,
        screening_kind: "umurava_platform_ai" as const,
        applicant: {
          _id: String(app?._id ?? cr.candidateId),
          job_id: jobIdStr,
          source: "umurava_platform" as const,
          parsed_profile: {
            name: `${firstName} ${lastName}`.trim() || "Unknown Candidate",
            email,
            skills,
            experience_years: Number(profile.totalYearsExperience ?? 0),
            education: educationSummary,
            summary: String(profile.summary ?? ""),
          },
        },
        composite_score: cr.totalScore,
        score_breakdown_points: b,
        dimension_scores: {
          skills: (b.skillsMatch / 35) * 100,
          experience: (b.experience / 25) * 100,
          education: (b.education / 15) * 100,
          cultural_fit: (b.roleRelevance / 15) * 100,
          additional_assets: (b.additionalAssets / 10) * 100,
        },
        strengths: cr.reasoning.strengths,
        gaps: cr.reasoning.gaps,
        recommendation: mapRecommendationBadge(cr.reasoning.recommendation),
        reasoning_detail: {
          relevanceSummary: cr.reasoning.relevanceSummary,
          recommendation: cr.reasoning.recommendation,
          hiringRisk: cr.reasoning.hiringRisk,
        },
      };
    }
    return mapLegacyRow(entry as CandidateResult);
  });

  const rdRaw = (screening as { recruiterDecisions?: unknown }).recruiterDecisions;
  const recruiterDecisions = plainRecruiterDecisions(rdRaw);

  reply.send({
    ranked,
    meta: {
      jobId: jobIdStr,
      screenedAt: screening.updatedAt?.toISOString?.() ?? screening.createdAt?.toISOString?.() ?? new Date().toISOString(),
      totalCandidatesScreened: stored?.totalEvaluated ?? stored?.totalAnalyzed ?? ranked.length,
      screeningKind: String((stored as { screeningKind?: string }).screeningKind ?? ""),
      averageScore: screening.averageScore ?? (stored as { averageScore?: number }).averageScore,
      recruiterDecisions,
    },
  });
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

const escapeCsvCell = (val: string): string => {
  const s = val ?? "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildShortlistExportCsv = (
  shortlist: unknown[],
  decisions: Record<string, unknown>,
): string => {
  const header = [
    "rank",
    "candidateId",
    "totalScore",
    "ai_recommendation",
    "hr_decision",
    "hr_note",
    "hr_decidedAt",
  ];
  const lines = [header.map(escapeCsvCell).join(",")];
  for (const entry of shortlist) {
    if (entry == null || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const candidateId = String(o.candidateId ?? "");
    const rank = o.rank != null ? String(o.rank) : "";
    const totalScore = o.totalScore != null ? String(o.totalScore) : "";
    let aiRec = "";
    if (isPlatformShortlistEntry(entry)) {
      const cr = entry;
      aiRec = String(cr.reasoning?.recommendation ?? "");
    } else {
      aiRec = String((o as unknown as CandidateResult).recommendation ?? "");
    }
    const dec = decisions[candidateId] as { decision?: string; hrNote?: string; decidedAt?: string } | undefined;
    lines.push(
      [rank, candidateId, totalScore, aiRec, dec?.decision ?? "", dec?.hrNote ?? "", dec?.decidedAt ?? ""]
        .map((c) => escapeCsvCell(String(c)))
        .join(","),
    );
  }
  return lines.join("\r\n");
};

export const exportScreening = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const { id } = request.params as { id: string };
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });

  const body = (request.body as { format?: string } | undefined) ?? {};
  const format = String(body.format ?? "pdf").toLowerCase();

  const screening = await ScreeningModel.findOne({ _id: id, recruiterId }).lean();
  if (!screening?.results) return void reply.code(404).send({ error: "Completed screening not found" });
  const job = await JobModel.findById(screening.jobId).lean();
  if (!job) return void reply.code(404).send({ error: "Job not found" });

  const rdRaw = (screening as { recruiterDecisions?: unknown }).recruiterDecisions;
  const recruiterDecisions = plainRecruiterDecisions(rdRaw);
  const shortlist = (screening.results as { shortlist?: unknown[] }).shortlist;
  if (!Array.isArray(shortlist)) {
    return void reply.code(404).send({ error: "No shortlist" });
  }

  if (format === "csv") {
    const csv = buildShortlistExportCsv(shortlist, recruiterDecisions);
    return void reply
      .header("Content-Type", "text/csv; charset=utf-8")
      .header("Content-Disposition", `attachment; filename=shortlist-${id}.csv`)
      .send(Buffer.from("\uFEFF" + csv, "utf8"));
  }

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

const AiChatBodySchema = z.object({
  candidateId: z.string().min(1),
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "model"]), content: z.string() }))
    .max(40)
    .optional()
    .default([]),
});

/**
 * POST /api/v1/screenings/:id/ai-chat
 * RAG-style chat: Gemini is given the full candidate context (scores, rationale, job requirements,
 * HR decision) so the recruiter can interrogate a specific shortlisted candidate.
 */
export const candidateAiChat = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });

  const { id } = request.params as { id: string };
  if (!Types.ObjectId.isValid(id)) return void reply.code(400).send({ error: "Invalid screening id" });

  const parsed = AiChatBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return void reply.code(400).send({ error: first?.message ?? "Invalid request" });
  }
  const { candidateId, message, history } = parsed.data;

  const screening = await ScreeningModel.findOne({ _id: id, recruiterId }).lean();
  if (!screening || screening.status !== "completed") {
    return void reply.code(404).send({ error: "Screening not found or not completed" });
  }

  const job = await JobModel.findById(screening.jobId).lean();

  // Find the candidate in shortlist (falls back to allResults)
  const results = screening.results as {
    shortlist?: Array<Record<string, unknown>>;
    allResults?: Array<Record<string, unknown>>;
  };
  const pool = (Array.isArray(results?.allResults) && results.allResults.length
    ? results.allResults
    : results?.shortlist) ?? [];

  // Match by MongoDB _id (the key used by recruiterDecisions / frontend) via applicant lookup
  const applicant = await ApplicantModel.findById(candidateId)
    .select("profile")
    .lean();

  const profileId = applicant
    ? String((applicant.profile as { id?: string }).id ?? candidateId)
    : candidateId;

  const candidate = pool.find((c) => String(c.candidateId ?? "") === profileId) as Record<string, unknown> | undefined;

  const rd = screening.recruiterDecisions as Record<string, unknown> | undefined;
  const hrEntry = rd?.[candidateId] as { decision?: string; hrNote?: string } | undefined;

  const name = applicant
    ? `${String((applicant.profile as { firstName?: string }).firstName ?? "")} ${String((applicant.profile as { lastName?: string }).lastName ?? "")}`.trim()
    : "the candidate";

  const jobTitle = String(job?.title ?? "the role");
  const jobReqs = job?.requirements as {
    mustHaveSkills?: string[];
    niceToHaveSkills?: string[];
    minExperienceYears?: number;
    educationLevel?: string;
    description?: string;
  } | undefined;

  // Build system context
  const ctx = [
    `You are an expert HR advisor helping a recruiter evaluate a candidate for the role: **${jobTitle}**.`,
    ``,
    `## Job Requirements`,
    jobReqs?.description ? `Description: ${jobReqs.description.slice(0, 600)}` : "",
    `Must-have skills: ${(jobReqs?.mustHaveSkills ?? []).join(", ") || "not specified"}`,
    `Nice-to-have: ${(jobReqs?.niceToHaveSkills ?? []).join(", ") || "none"}`,
    `Min experience: ${jobReqs?.minExperienceYears ?? "not specified"} years`,
    `Education: ${jobReqs?.educationLevel ?? "not specified"}`,
    ``,
    `## Candidate: ${name}`,
    candidate
      ? [
          `Overall score: ${String(candidate.totalScore ?? candidate.composite_score ?? "N/A")}/100`,
          `AI recommendation: ${String(candidate.recommendation ?? "N/A")}`,
          `Strengths: ${(candidate.strengths as string[] | undefined ?? []).join("; ")}`,
          `Gaps: ${(candidate.gaps as string[] | undefined ?? []).join("; ")}`,
          candidate.relevanceSummary ? `AI rationale: ${String(candidate.relevanceSummary).slice(0, 500)}` : "",
          candidate.hiringRisk ? `Hiring risk: ${String(candidate.hiringRisk)}` : "",
        ].filter(Boolean).join("\n")
      : "Candidate scoring data not found in this screening.",
    ``,
    hrEntry?.decision
      ? `## HR Decision\nThe recruiter has marked this candidate as: **${hrEntry.decision}**${hrEntry.hrNote ? `\nHR note: "${hrEntry.hrNote}"` : ""}.`
      : "## HR Decision\nNo HR decision recorded yet.",
    ``,
    `Answer the recruiter's questions concisely and honestly. If asked about the candidate's fit, reference the scores and AI rationale. You may give a direct opinion but always remind the recruiter that the final decision is theirs.`,
  ].filter((l) => l !== undefined).join("\n");

  // Build conversation turns for Gemini
  const turns = [
    ...(history ?? []).map((h) => `${h.role === "user" ? "Recruiter" : "AI"}: ${h.content}`),
    `Recruiter: ${message}`,
  ].join("\n\n");

  const prompt = `${ctx}\n\n---\n\n${turns}\n\nAI:`;

  try {
    const replyText = await generatePlainText(prompt, 20_000);
    reply.send({ reply: replyText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    reply.code(500).send({ error: `AI chat failed: ${msg.slice(0, 200)}` });
  }
};

const AdvisoryBodySchema = z.object({
  message: z.string().min(1).max(2000),
  history: z
    .array(z.object({ role: z.enum(["user", "model"]), content: z.string() }))
    .max(40)
    .optional()
    .default([]),
});

/**
 * POST /api/v1/screenings/:id/advisory-chat
 * Cohort-level AI advisory: Gemini receives context for ALL ranked candidates so the
 * recruiter can ask comparative questions (who to hire, common gaps, red flags, etc.).
 */
export const poolAdvisoryChat = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const recruiterId = request.user?.userId;
  if (!recruiterId) return void reply.code(401).send({ error: "Unauthorized" });

  const { id } = request.params as { id: string };
  if (!Types.ObjectId.isValid(id)) return void reply.code(400).send({ error: "Invalid screening id" });

  const parsed = AdvisoryBodySchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return void reply.code(400).send({ error: first?.message ?? "Invalid request" });
  }
  const { message, history } = parsed.data;

  const screening = await ScreeningModel.findOne({ _id: id, recruiterId }).lean();
  if (!screening || screening.status !== "completed") {
    return void reply.code(404).send({ error: "Screening not found or not completed" });
  }

  const job = await JobModel.findById(screening.jobId).lean();
  const jobTitle = String(job?.title ?? "the role");
  const jobReqs = job?.requirements as {
    mustHaveSkills?: string[];
    niceToHaveSkills?: string[];
    minExperienceYears?: number;
    educationLevel?: string;
    description?: string;
  } | undefined;

  const results = screening.results as {
    shortlist?: Array<Record<string, unknown>>;
    allResults?: Array<Record<string, unknown>>;
  };
  const pool = (Array.isArray(results?.allResults) && results.allResults.length
    ? results.allResults
    : results?.shortlist) ?? [];

  const rd = screening.recruiterDecisions as Record<string, { decision?: string; hrNote?: string }> | undefined;

  // Build per-candidate summary rows (sorted by rank, max 25)
  const sorted = [...pool]
    .sort((a, b) => Number(a.rank ?? 99) - Number(b.rank ?? 99))
    .slice(0, 25);

  const candidateRows = sorted.map((c) => {
    const rank = Number(c.rank ?? "?");
    const score = String(c.totalScore ?? c.composite_score ?? "N/A");
    const rec = String(c.recommendation ?? "N/A");
    const strengths = (c.strengths as string[] | undefined ?? []).slice(0, 4).join("; ") || "none listed";
    const gaps = (c.gaps as string[] | undefined ?? []).slice(0, 4).join("; ") || "none listed";
    const risk = c.hiringRisk ? ` | Risk: ${String(c.hiringRisk)}` : "";
    return (
      `Rank #${rank}: Score ${score}/100 | AI: ${rec}${risk}\n` +
      `  Strengths: ${strengths}\n` +
      `  Gaps: ${gaps}`
    );
  }).join("\n\n");

  // HR decisions summary
  const decisionEntries = Object.values(rd ?? {});
  const approvedCount = decisionEntries.filter((v) => v?.decision === "approved").length;
  const rejectedCount = decisionEntries.filter((v) => v?.decision === "rejected").length;
  const pendingCount = sorted.length - decisionEntries.length;
  const hrSummary =
    decisionEntries.length > 0
      ? `HR has reviewed ${decisionEntries.length} of ${sorted.length} candidates: ${approvedCount} approved, ${rejectedCount} rejected, ${pendingCount} pending.`
      : `No HR decisions recorded yet for this screening.`;

  const ctx = [
    `You are an expert AI HR advisor helping a recruiter make hiring decisions for the role: **${jobTitle}**.`,
    ``,
    `## Job Requirements`,
    jobReqs?.description ? `Description: ${jobReqs.description.slice(0, 500)}` : "",
    `Must-have skills: ${(jobReqs?.mustHaveSkills ?? []).join(", ") || "not specified"}`,
    `Nice-to-have: ${(jobReqs?.niceToHaveSkills ?? []).join(", ") || "none"}`,
    `Min experience: ${jobReqs?.minExperienceYears ?? "not specified"} years`,
    `Education required: ${jobReqs?.educationLevel ?? "not specified"}`,
    ``,
    `## Candidate Pool (${sorted.length} screened)`,
    candidateRows,
    ``,
    `## Current HR Status`,
    hrSummary,
    ``,
    `Give objective, concise advice based on the scoring data above. When comparing candidates always reference their rank and score. You may give a direct hiring recommendation but always remind the recruiter that the final decision is theirs.`,
    `IMPORTANT: Respond in plain conversational text only. Do NOT wrap your answer in JSON, XML, markdown code blocks, or any structured format.`,
  ].filter((l) => l !== undefined).join("\n");

  const turns = [
    ...(history ?? []).map((h) => `${h.role === "user" ? "Recruiter" : "AI"}: ${h.content}`),
    `Recruiter: ${message}`,
  ].join("\n\n");

  const prompt = `${ctx}\n\n---\n\n${turns}\n\nAI:`;

  try {
    const replyText = await generatePlainText(prompt, 20_000);
    reply.send({ reply: replyText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    reply.code(500).send({ error: `Advisory chat failed: ${msg.slice(0, 200)}` });
  }
};
