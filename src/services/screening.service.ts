import type { z } from "zod";
import { Types } from "mongoose";
import { ApplicantModel } from "../models/Applicant.model";
import { JobModel } from "../models/Job.model";
import type {
  CandidateResult,
  JobRequirements,
  PlatformCandidateResult,
  PoolInsights,
  TalentProfile,
  UmuravaProfile,
} from "../types";
import { ZodTalentPlatformProfile } from "../utils/jsonValidator";
import { generatePoolInsights, scoreAllCandidates, scoreUmuravaPlatformCandidates } from "./gemini.service";
import { normalizeProfile } from "./parser.service";
import { parseTalentProfile } from "./talentProfile.adapter";

/** Maps platform AI rows to legacy shape for pool-insights aggregation. */
export function platformResultToLegacyCandidateResult(p: PlatformCandidateResult): CandidateResult {
  const b = p.scoreBreakdown;
  return {
    candidateId: p.candidateId,
    rank: p.rank,
    totalScore: p.totalScore,
    breakdown: {
      skillsMatch: Math.min(100, (b.skillsMatch / 35) * 100),
      experienceMatch: Math.min(100, (b.experience / 25) * 100),
      educationMatch: Math.min(100, (b.education / 15) * 100),
      culturalFit: Math.min(100, (b.roleRelevance / 15) * 100),
    },
    strengths: p.reasoning.strengths,
    gaps: p.reasoning.gaps,
    recommendation: p.reasoning.recommendation,
    mustHaveSkillsMet: p.mustHaveSkillsMet,
    mustHaveSkillsMissing: p.mustHaveSkillsMissing,
    estimatedOnboardingTime: p.estimatedOnboardingTime,
    aiConfidenceScore: p.aiConfidenceScore,
  };
}

/**
 * Scenario 1 — loads pending `umurava_platform` applicants for the job, scores with the 35/25/15/15/10 rubric via Gemini,
 * returns ranked results and pool insights.
 */
export async function screenFromUmuravaPlatformJob(params: {
  jobId: string;
  recruiterId: string;
  shortlistSize: 10 | 20;
}): Promise<{
  jobRequirements: JobRequirements;
  allResults: PlatformCandidateResult[];
  shortlist: PlatformCandidateResult[];
  insights: PoolInsights;
  /** Pending Umurava applicants that were screened (for status updates). */
  applicantsInPool: Array<{ _id: unknown; profile: unknown }>;
}> {
  const dbJob = await JobModel.findOne({ _id: params.jobId, recruiterId: params.recruiterId }).lean();
  if (!dbJob) throw new Error("Job not found");

  const applicantsInPool = await ApplicantModel.find({
    jobId: params.jobId,
    source: "umurava_platform",
    status: "pending",
  }).lean();

  if (!applicantsInPool.length) throw new Error("No pending Umurava platform applicants for this job");

  const jobRequirements = leanJobToJobRequirements(dbJob as Parameters<typeof leanJobToJobRequirements>[0]);
  const candidates: TalentProfile[] = applicantsInPool.map((a) => parseTalentProfile(a.profile));
  const allResults = await scoreUmuravaPlatformCandidates(jobRequirements, candidates);
  const legacyPool = allResults.map(platformResultToLegacyCandidateResult);
  const insights = await generatePoolInsights(jobRequirements, legacyPool);
  const shortlist = allResults.slice(0, params.shortlistSize);
  return { jobRequirements, allResults, shortlist, insights, applicantsInPool };
}

/** Map Mongo job document to `JobRequirements` for Gemini scoring (aligned with screening worker). */
export function leanJobToJobRequirements(dbJob: {
  title: string;
  description: string;
  requirements: {
    title?: string;
    description?: string;
    mustHaveSkills?: string[];
    niceToHaveSkills?: string[];
    minYearsExperience?: number;
    educationLevel?: string;
    domain?: string;
    location?: string;
    remoteAllowed?: boolean;
    salaryRange?: { min?: number; max?: number; currency?: string };
    softSkills?: string[];
  };
}): JobRequirements {
  const r = dbJob.requirements ?? {};
  const edu = r.educationLevel;
  const educationLevel: JobRequirements["educationLevel"] =
    edu === "none" || edu === "certificate" || edu === "bachelor" || edu === "master" || edu === "phd" ? edu : "bachelor";

  return {
    title: String(r.title ?? dbJob.title),
    description: String(r.description ?? dbJob.description),
    mustHaveSkills: Array.isArray(r.mustHaveSkills) ? r.mustHaveSkills : [],
    niceToHaveSkills: Array.isArray(r.niceToHaveSkills) ? r.niceToHaveSkills : [],
    minYearsExperience: typeof r.minYearsExperience === "number" ? r.minYearsExperience : 0,
    educationLevel,
    domain: typeof r.domain === "string" ? r.domain : "general",
    location: typeof r.location === "string" ? r.location : undefined,
    remoteAllowed: Boolean(r.remoteAllowed),
    salaryRange:
      r.salaryRange &&
      typeof r.salaryRange.min === "number" &&
      typeof r.salaryRange.max === "number" &&
      typeof r.salaryRange.currency === "string"
        ? { min: r.salaryRange.min, max: r.salaryRange.max, currency: r.salaryRange.currency }
        : undefined,
    softSkills: Array.isArray(r.softSkills) ? r.softSkills : undefined,
  };
}

/** Scenario 1 — Umurava Talent Profile schema → internal `UmuravaProfile`. */
export function talentPlatformToUmuravaProfile(t: z.infer<typeof ZodTalentPlatformProfile>): UmuravaProfile {
  const nameParts = t.name.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "Unknown";
  const lastName = nameParts.slice(1).join(" ") || "Candidate";
  const expYears = Math.max(0, Number(t.experience_years) || 0);
  const roles = t.previous_roles.length ? t.previous_roles : ["Professional experience"];
  const perRoleYears = Math.max(1, Math.round(expYears / Math.max(roles.length, 1)));

  return normalizeProfile({
    id: t.id,
    firstName,
    lastName,
    email: t.email,
    title: roles[0] ?? "Professional",
    summary: [t.education, t.portfolio_url ? `Portfolio: ${t.portfolio_url}` : "", t.github_url ? `GitHub: ${t.github_url}` : ""]
      .filter(Boolean)
      .join(" · "),
    skills: t.skills.map((s) => s.trim().toLowerCase()),
    languages: [],
    experience: roles.map((role) => ({
      company: "Various",
      title: role,
      startDate: "2018-01",
      endDate: "2024-12",
      description: role,
      yearsInRole: perRoleYears,
    })),
    education: [{ institution: "See profile", degree: t.education, field: "General", graduationYear: 2020 }],
    totalYearsExperience: expYears,
    location: t.location,
    remotePreference: "flexible",
  });
}

/** Scenario 1: structured Umurava profiles + job → ranked shortlist with explainable Gemini scores. */
export async function screenFromPlatform(params: {
  jobId: string;
  recruiterId: string;
  profilesRaw: unknown[];
  shortlistSize: 10 | 20;
}): Promise<{
  jobRequirements: JobRequirements;
  allResults: CandidateResult[];
  shortlist: CandidateResult[];
  insights: PoolInsights;
}> {
  const dbJob = await JobModel.findOne({ _id: params.jobId, recruiterId: params.recruiterId }).lean();
  if (!dbJob) throw new Error("Job not found");

  const jobRequirements = leanJobToJobRequirements(dbJob as Parameters<typeof leanJobToJobRequirements>[0]);
  const candidates: UmuravaProfile[] = [];
  for (let i = 0; i < params.profilesRaw.length; i += 1) {
    const parsed = ZodTalentPlatformProfile.safeParse(params.profilesRaw[i]);
    if (!parsed.success) {
      throw new Error(`profiles[${i}]: ${parsed.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ")}`);
    }
    candidates.push(talentPlatformToUmuravaProfile(parsed.data));
  }
  if (!candidates.length) throw new Error("No profiles to screen");

  const allResults = await scoreAllCandidates(jobRequirements, candidates);
  const insights = await generatePoolInsights(jobRequirements, allResults);
  const shortlist = allResults.slice(0, params.shortlistSize);
  return { jobRequirements, allResults, shortlist, insights };
}

/** Scenario 2: applicants already ingested (PDF / CSV / URLs) → same scoring & explainable output. */
export async function screenFromExternal(params: {
  jobId: string;
  recruiterId: string;
  applicantIds?: string[];
  shortlistSize: 10 | 20;
}): Promise<{
  jobRequirements: JobRequirements;
  allResults: CandidateResult[];
  shortlist: CandidateResult[];
  insights: PoolInsights;
}> {
  const dbJob = await JobModel.findOne({ _id: params.jobId, recruiterId: params.recruiterId }).lean();
  if (!dbJob) throw new Error("Job not found");

  const jobRequirements = leanJobToJobRequirements(dbJob as Parameters<typeof leanJobToJobRequirements>[0]);
  const filter: Record<string, unknown> = { jobId: params.jobId };
  if (params.applicantIds?.length) {
    filter._id = { $in: params.applicantIds.map((id) => new Types.ObjectId(id)) };
  }

  const applicants = await ApplicantModel.find(filter).lean();
  const candidates = applicants.map((a) => normalizeProfile(a.profile));
  if (!candidates.length) throw new Error("No applicants found for this job (upload or ingest candidates first)");

  const allResults = await scoreAllCandidates(jobRequirements, candidates);
  const insights = await generatePoolInsights(jobRequirements, allResults);
  const shortlist = allResults.slice(0, params.shortlistSize);
  return { jobRequirements, allResults, shortlist, insights };
}
