import { GoogleGenerativeAI, FunctionCallingMode, SchemaType } from "@google/generative-ai";
import type { FunctionDeclaration, Tool } from "@google/generative-ai";
import { env } from "../config/env";
import { agentTurn, AiServiceError, normaliseText } from "./aiClient";
import type { AgentContent } from "./aiClient";
import { JobModel } from "../models/Job.model";
import { ApplicantModel } from "../models/Applicant.model";
import { ScreeningModel } from "../models/Screening.model";
import { InterviewModel } from "../models/Interview.model";
import { UserModel } from "../models/User.model";
import { createInterview, cancelInterview } from "./interview.service";
import { heuristicExtractResume, mergeGeminiResume, normalizeProfile } from "./parser.service";
import { runScreeningForJobAgent } from "./screening.service";
import { callGeminiWithRetry } from "./gemini.service";
import { buildResumeExtractionPrompt } from "../utils/promptBuilder";
import { ZodResumeGeminiExtraction } from "../utils/jsonValidator";
import { pythonProfileToUmurava } from "./pythonAdapter";
import { randomUUID } from "node:crypto";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

// ---------------------------------------------------------------------------
// Pre-parse cache — populated by extractTextHandler (pdfplumber quality),
// consumed by ingest_resume to skip re-parsing the same resume text.
// ---------------------------------------------------------------------------
const PRE_PARSE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const preParsedCache = new Map<string, { profile: Record<string, unknown>; expiresAt: number }>();

/** Key derived from the first 300 chars of resume text (stable across truncations). */
const preParseCacheKey = (text: string) => text.slice(0, 300).trim();

export function cacheParsedProfile(rawText: string, profile: Record<string, unknown>): void {
  const key = preParseCacheKey(rawText);
  if (!key) return;
  preParsedCache.set(key, { profile, expiresAt: Date.now() + PRE_PARSE_TTL_MS });
  // Evict expired entries to avoid unbounded growth
  for (const [k, v] of preParsedCache) {
    if (v.expiresAt < Date.now()) preParsedCache.delete(k);
  }
}

function getCachedParsedProfile(resumeText: string): Record<string, unknown> | null {
  const key = preParseCacheKey(resumeText);
  const entry = preParsedCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    preParsedCache.delete(key);
    return null;
  }
  return entry.profile;
}

export type AgentMessage = { role: "user" | "model"; content: string };
export type ToolCall = { name: string; args: Record<string, unknown>; result: unknown };

const SYSTEM_INSTRUCTION = `You are HERON, an AI hiring assistant for the HERON platform. You help recruiters manage their entire hiring pipeline hands-free.

You have tools to create and manage jobs, ingest resumes, run AI screenings, query applicants and screenings, approve candidates, schedule interviews, and more.

Critical rules — follow these strictly:
- NEVER ask the recruiter for an ID. IDs are internal database keys. Always look them up yourself using tools before doing anything that needs an ID.
  - Need a job ID? → call list_jobs first.
  - Need an applicant ID or email? → call search_applicants (by name) or get_applicants (by jobId).
  - Need a screening ID? → call list_screenings first.
- NEVER say "I cannot search the database" — you have tools that can. Use them.
- Chain tool calls automatically. For example:
  - "Schedule an interview for John Smith" → search_applicants → schedule_interview.
  - "Accept/approve/reject a candidate" → search_applicants → list_screenings → approve_candidate.
  - "Add this resume to [job] and screen it" → list_jobs → ingest_resume → run_screening.
  - "Run a screening for [job]" → list_jobs → run_screening.
- When the recruiter pastes resume text, call ingest_resume automatically with the job they mentioned (or ask which job if unclear), then offer to run_screening.
- When you receive a message containing one or more "[Resume uploaded:" entries, do the following in order without asking for confirmation: (1) Write a brief introduction (2–3 sentences) for EACH candidate covering their name, current role, and top 3–5 skills. (2) Call list_jobs ONCE to find the right job. (3) Call ingest_resume for ALL uploaded resumes — one call per resume, all before running any screening. (4) After ALL resumes are ingested, call run_screening ONCE. (5) Present the topCandidates array from the run_screening result as a ranked list — show rank, name, score, recommendation, strengths, and gaps for each candidate. IMPORTANT: never call run_screening between ingest_resume calls — ingest every resume first, then screen once. IMPORTANT: run_screening already returns the full ranked shortlist in topCandidates — do NOT call get_screening_results afterward, just present topCandidates directly.
- When scheduling interviews, default to "video" type if the recruiter doesn't specify. Default to a 1-hour slot if no duration is given.
- Present results clearly. Use bullet points for lists. Be concise.
- Never invent data. If a tool returns nothing, say so and suggest next steps.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const functionDeclarations: any[] = [
  {
    name: "list_jobs",
    description: "List all jobs created by this recruiter, optionally filtered by status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Filter by job status: 'active', 'draft', or 'closed'. Omit for all.",
          enum: ["active", "draft", "closed"],
        },
        limit: {
          type: SchemaType.NUMBER,
          description: "Maximum number of jobs to return (default 10, max 50).",
        },
      },
      required: [],
    },
  },
  {
    name: "get_job_details",
    description: "Get full details for a specific job including requirements, skills, and applicant count.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        jobId: { type: SchemaType.STRING, description: "The job's MongoDB _id." },
      },
      required: ["jobId"],
    },
  },
  {
    name: "get_applicants",
    description: "List applicants for a specific job with their name, email, and status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        jobId: { type: SchemaType.STRING, description: "The job's MongoDB _id." },
        limit: { type: SchemaType.NUMBER, description: "Max applicants to return (default 20, max 100)." },
      },
      required: ["jobId"],
    },
  },
  {
    name: "search_applicants",
    description: "Search for applicants by name across all jobs (or within a specific job). Use this whenever the recruiter mentions a candidate by name and you need their ID or email.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING, description: "Partial or full name to search for (case-insensitive)." },
        jobId: { type: SchemaType.STRING, description: "Limit search to a specific job's applicants (optional)." },
      },
      required: ["name"],
    },
  },
  {
    name: "list_screenings",
    description: "List AI screening runs for this recruiter, optionally filtered by status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Filter by screening status: 'queued', 'running', 'completed', or 'failed'.",
          enum: ["queued", "running", "completed", "failed"],
        },
        jobId: { type: SchemaType.STRING, description: "Filter screenings by a specific job ID." },
        limit: { type: SchemaType.NUMBER, description: "Max screenings to return (default 10, max 50)." },
      },
      required: [],
    },
  },
  {
    name: "get_screening_results",
    description: "Get the ranked shortlist and scores from a completed AI screening run.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        screeningId: { type: SchemaType.STRING, description: "The screening's MongoDB _id." },
        limit: { type: SchemaType.NUMBER, description: "Max candidates to include in the summary (default 10, max 20)." },
      },
      required: ["screeningId"],
    },
  },
  {
    name: "list_interviews",
    description: "List interviews scheduled by this recruiter, optionally filtered by status.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        status: {
          type: SchemaType.STRING,
          description: "Filter by status: 'pending', 'confirmed', 'cancelled', or 'completed'.",
          enum: ["pending", "confirmed", "cancelled", "completed"],
        },
        limit: { type: SchemaType.NUMBER, description: "Max interviews to return (default 10, max 50)." },
      },
      required: [],
    },
  },
  {
    name: "get_pipeline_summary",
    description: "Get a high-level overview of the recruiter's hiring pipeline: job counts, applicant totals, pending screenings, and upcoming interviews.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
  },
  {
    name: "schedule_interview",
    description: "Schedule an interview for a candidate. Sends an invite email with calendar attachment.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        applicantId: { type: SchemaType.STRING, description: "MongoDB _id of the Applicant document." },
        candidateName: { type: SchemaType.STRING, description: "Full name of the candidate." },
        candidateEmail: { type: SchemaType.STRING, description: "Email address of the candidate." },
        jobId: { type: SchemaType.STRING, description: "MongoDB _id of the Job." },
        jobTitle: { type: SchemaType.STRING, description: "Title of the job." },
        screeningId: { type: SchemaType.STRING, description: "MongoDB _id of the Screening (optional)." },
        interviewType: {
          type: SchemaType.STRING,
          description: "Format of the interview.",
          enum: ["video", "phone", "in-person"],
        },
        proposedSlots: {
          type: SchemaType.ARRAY,
          description: "1–3 proposed time slots in ISO 8601 UTC format.",
          items: {
            type: SchemaType.OBJECT,
            properties: {
              start: { type: SchemaType.STRING, description: "Start time ISO 8601 UTC." },
              end: { type: SchemaType.STRING, description: "End time ISO 8601 UTC." },
            },
            required: ["start", "end"],
          },
        },
        meetingLink: { type: SchemaType.STRING, description: "Optional video conference link." },
        notes: { type: SchemaType.STRING, description: "Optional notes for the candidate." },
        title: { type: SchemaType.STRING, description: "Custom title for the interview (optional)." },
      },
      required: ["applicantId", "candidateName", "candidateEmail", "jobId", "jobTitle", "interviewType", "proposedSlots"],
    },
  },
];

functionDeclarations.push({
  name: "create_job",
  description: "Create a new job posting. The agent fills in all required fields from the recruiter's description. If the recruiter says 'mock job' or 'fill the details', invent realistic placeholder values. Status defaults to 'active'; use 'draft' when the recruiter says so.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      title: { type: SchemaType.STRING, description: "Job title, e.g. 'AI Engineer'." },
      company: { type: SchemaType.STRING, description: "Company name (optional)." },
      description: { type: SchemaType.STRING, description: "Full job description." },
      status: { type: SchemaType.STRING, description: "Job status: active, draft, or closed. Default: active.", enum: ["active", "draft", "closed"] },
      domain: { type: SchemaType.STRING, description: "Job domain, e.g. 'engineering', 'product', 'design'." },
      mustHaveSkills: { type: SchemaType.ARRAY, description: "List of required skills.", items: { type: SchemaType.STRING } },
      niceToHaveSkills: { type: SchemaType.ARRAY, description: "List of nice-to-have skills.", items: { type: SchemaType.STRING } },
      minYearsExperience: { type: SchemaType.NUMBER, description: "Minimum years of experience required." },
      educationLevel: { type: SchemaType.STRING, description: "Minimum education level.", enum: ["none", "certificate", "bachelor", "master", "phd"] },
      location: { type: SchemaType.STRING, description: "Job location (optional)." },
      remoteAllowed: { type: SchemaType.STRING, description: "Whether remote work is allowed: yes or no.", enum: ["yes", "no"] },
      softSkills: { type: SchemaType.ARRAY, description: "Desired soft skills.", items: { type: SchemaType.STRING } },
    },
    required: ["title", "description"],
  },
});

functionDeclarations.push({
  name: "update_job_status",
  description: "Update the status of an existing job (active, draft, or closed).",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      jobId: { type: SchemaType.STRING, description: "The job's MongoDB _id." },
      status: { type: SchemaType.STRING, description: "New status.", enum: ["active", "draft", "closed"] },
    },
    required: ["jobId", "status"],
  },
});

functionDeclarations.push({
  name: "ingest_resume",
  description: "Parse resume text pasted by the recruiter and add the candidate as an applicant for a job. Call this whenever the recruiter pastes a resume or CV. The resume text can be raw plain-text copied from a PDF or document.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      jobId: { type: SchemaType.STRING, description: "The job's MongoDB _id to attach this applicant to." },
      resumeText: { type: SchemaType.STRING, description: "The raw resume / CV text pasted by the recruiter." },
    },
    required: ["jobId", "resumeText"],
  },
});

functionDeclarations.push({
  name: "run_screening",
  description: "Run AI screening on all pending applicants for a job. Use this after ingest_resume or when the recruiter asks to screen/rank candidates for a job. Returns the screening ID and a summary of the top candidates.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      jobId: { type: SchemaType.STRING, description: "The job's MongoDB _id to run screening for." },
      shortlistSize: {
        type: SchemaType.NUMBER,
        description: "Number of candidates to shortlist: 10 or 20. Defaults to 10.",
      },
    },
    required: ["jobId"],
  },
});

// Add approve_candidate declaration after schedule_interview
functionDeclarations.push({
  name: "approve_candidate",
  description: "Set the HR decision for a candidate in a screening (approve, reject, or mark for review). Use this when the recruiter says 'accept', 'approve', 'reject', or 'mark for review'.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      screeningId: { type: SchemaType.STRING, description: "The screening's MongoDB _id." },
      applicantId: { type: SchemaType.STRING, description: "The Applicant document's MongoDB _id." },
      decision: { type: SchemaType.STRING, description: "The HR decision.", enum: ["approved", "rejected", "review"] },
      hrNote: { type: SchemaType.STRING, description: "Optional note from the HR/recruiter." },
    },
    required: ["screeningId", "applicantId", "decision"],
  },
});

functionDeclarations.push({
  name: "get_applicant_details",
  description: "Get full profile details for a specific applicant including skills, experience, education, location, and their screening score if available. Use this after search_applicants when the recruiter wants to know more about a specific candidate.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      applicantId: { type: SchemaType.STRING, description: "MongoDB _id of the Applicant document." },
    },
    required: ["applicantId"],
  },
});

functionDeclarations.push({
  name: "search_applicants_by_skill",
  description: "Find applicants who have a specific skill listed in their profile. Use this when the recruiter asks 'find candidates who know React' or similar. Searches both string[] and {name, level}[] skill shapes.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      skill: { type: SchemaType.STRING, description: "Skill to search for (case-insensitive, partial match)." },
      jobId: { type: SchemaType.STRING, description: "Limit search to a specific job (optional)." },
      limit: { type: SchemaType.NUMBER, description: "Max results to return (default 30, max 100)." },
    },
    required: ["skill"],
  },
});

functionDeclarations.push({
  name: "update_job",
  description: "Update fields on an existing job posting such as title, description, required skills, experience level, education, location, or remote policy. Use this when the recruiter asks to edit or change a job.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      jobId: { type: SchemaType.STRING, description: "The job's MongoDB _id." },
      title: { type: SchemaType.STRING, description: "New job title (optional)." },
      description: { type: SchemaType.STRING, description: "New job description (optional)." },
      company: { type: SchemaType.STRING, description: "Company name (optional)." },
      domain: { type: SchemaType.STRING, description: "Job domain e.g. engineering, product (optional)." },
      mustHaveSkills: { type: SchemaType.ARRAY, description: "Updated list of required skills (optional).", items: { type: SchemaType.STRING } },
      niceToHaveSkills: { type: SchemaType.ARRAY, description: "Updated list of nice-to-have skills (optional).", items: { type: SchemaType.STRING } },
      minYearsExperience: { type: SchemaType.NUMBER, description: "Minimum years of experience (optional)." },
      educationLevel: { type: SchemaType.STRING, description: "Education level: none, certificate, bachelor, master, or phd (optional).", enum: ["none", "certificate", "bachelor", "master", "phd"] },
      location: { type: SchemaType.STRING, description: "Job location (optional)." },
      remoteAllowed: { type: SchemaType.STRING, description: "Whether remote is allowed: yes or no (optional).", enum: ["yes", "no"] },
    },
    required: ["jobId"],
  },
});

functionDeclarations.push({
  name: "cancel_interview",
  description: "Cancel a scheduled interview. Updates status to cancelled, removes the Google Calendar event if present, and sends a cancellation email to the candidate.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      interviewId: { type: SchemaType.STRING, description: "MongoDB _id of the Interview document." },
      reason: { type: SchemaType.STRING, description: "Optional reason for cancellation to include in the candidate email." },
    },
    required: ["interviewId"],
  },
});

const agentTools: Tool[] = [{ functionDeclarations }];

/**
 * Models confirmed to support function calling with tools/systemInstruction in the v1 API.
 * gemini-2.5-flash-lite does NOT — excluded unconditionally regardless of env.GEMINI_MODEL.
 */
const FUNCTION_CALLING_UNSUPPORTED = new Set(["gemini-2.5-flash-lite"]);
const AGENT_CAPABLE_MODELS = [env.GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash"]
  .filter((m) => !FUNCTION_CALLING_UNSUPPORTED.has(m))
  .filter((m, i, arr) => arr.indexOf(m) === i);

/** Extract a display name from the Mixed profile field regardless of source shape. */
function extractApplicantName(profile: unknown): string {
  if (!profile || typeof profile !== "object") return "Unknown";
  const p = profile as Record<string, unknown>;
  // Umurava platform shape
  if (typeof p.name === "string" && p.name.trim()) return p.name.trim();
  // firstName + lastName
  const first = typeof p.firstName === "string" ? p.firstName.trim() : "";
  const last = typeof p.lastName === "string" ? p.lastName.trim() : "";
  if (first || last) return `${first} ${last}`.trim();
  // fullName
  if (typeof p.fullName === "string" && p.fullName.trim()) return p.fullName.trim();
  // personalInfo sub-object (some CSV parsers)
  const pi = p.personalInfo as Record<string, unknown> | undefined;
  if (pi) {
    if (typeof pi.name === "string" && pi.name.trim()) return pi.name.trim();
    const pf = typeof pi.firstName === "string" ? pi.firstName.trim() : "";
    const pl = typeof pi.lastName === "string" ? pi.lastName.trim() : "";
    if (pf || pl) return `${pf} ${pl}`.trim();
  }
  return "Unknown";
}

function extractApplicantEmail(profile: unknown): string | null {
  if (!profile || typeof profile !== "object") return null;
  const p = profile as Record<string, unknown>;
  if (typeof p.email === "string" && p.email.trim()) return p.email.trim();
  const pi = p.personalInfo as Record<string, unknown> | undefined;
  if (pi && typeof pi.email === "string") return pi.email.trim();
  return null;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  recruiterId: string,
  sessionCache: Map<string, unknown> = new Map(),
): Promise<unknown> {
  switch (name) {
    case "list_jobs": {
      const filter: Record<string, unknown> = { recruiterId };
      if (args.status) filter.status = args.status;
      const limit = Math.min(Number(args.limit ?? 10), 50);
      const jobs = await JobModel.find(filter).lean().limit(limit).sort({ createdAt: -1 });
      return jobs.map((j) => ({
        id: String(j._id),
        title: j.title,
        company: j.company ?? null,
        status: j.status,
        domain: j.requirements?.domain ?? null,
        createdAt: j.createdAt,
      }));
    }

    case "get_job_details": {
      const job = await JobModel.findOne({ _id: args.jobId, recruiterId }).lean();
      if (!job) return { error: "Job not found or access denied." };
      const applicantCount = await ApplicantModel.countDocuments({ jobId: job._id });
      return {
        id: String(job._id),
        title: job.title,
        company: job.company ?? null,
        status: job.status,
        description: job.description?.slice(0, 500),
        requirements: {
          mustHaveSkills: job.requirements?.mustHaveSkills ?? [],
          niceToHaveSkills: job.requirements?.niceToHaveSkills ?? [],
          minYearsExperience: job.requirements?.minYearsExperience ?? 0,
          educationLevel: job.requirements?.educationLevel ?? "none",
          domain: job.requirements?.domain ?? "general",
          location: job.requirements?.location ?? null,
          remoteAllowed: job.requirements?.remoteAllowed ?? false,
        },
        applicantCount,
        createdAt: job.createdAt,
      };
    }

    case "get_applicants": {
      const limit = Math.min(Number(args.limit ?? 20), 100);
      const applicants = await ApplicantModel.find({ jobId: String(args.jobId) }).lean().limit(limit);
      return applicants.map((a) => ({
        id: String(a._id),
        source: a.source,
        status: a.status,
        name: extractApplicantName(a.profile),
        email: extractApplicantEmail(a.profile),
        createdAt: a.createdAt,
      }));
    }

    case "search_applicants": {
      const nameQuery = String(args.name ?? "").trim();
      if (!nameQuery) return { error: "name is required for search_applicants." };

      // Find all jobs for this recruiter
      const jobFilter: Record<string, unknown> = {};
      if (args.jobId) {
        jobFilter._id = String(args.jobId);
      } else {
        const jobs = await JobModel.find({ recruiterId }).select("_id").lean();
        jobFilter._id = { $in: jobs.map((j) => j._id) };
      }
      const jobs = await JobModel.find({ recruiterId, ...( args.jobId ? { _id: String(args.jobId) } : {}) }).select("_id title").lean();
      const jobIds = jobs.map((j) => j._id);
      const jobTitleById = new Map(jobs.map((j) => [String(j._id), j.title]));

      const applicants = await ApplicantModel.find({ jobId: { $in: jobIds } }).lean().limit(200);

      const regex = new RegExp(nameQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const matches = applicants.filter((a) => regex.test(extractApplicantName(a.profile)));

      if (matches.length === 0) return { found: 0, results: [], message: `No applicants found matching "${nameQuery}".` };

      return {
        found: matches.length,
        results: matches.map((a) => ({
          id: String(a._id),
          name: extractApplicantName(a.profile),
          email: extractApplicantEmail(a.profile),
          status: a.status,
          source: a.source,
          jobId: String(a.jobId),
          jobTitle: jobTitleById.get(String(a.jobId)) ?? "Unknown job",
        })),
      };
    }

    case "get_applicant_details": {
      const applicantId = String(args.applicantId ?? "").trim();
      if (!applicantId) return { error: "applicantId is required." };

      const applicant = await ApplicantModel.findById(applicantId).lean();
      if (!applicant) return { error: "Applicant not found." };

      const job = await JobModel.findOne({ _id: applicant.jobId, recruiterId }).select("title").lean();
      if (!job) return { error: "Access denied — this applicant is not in one of your jobs." };

      const profile = (applicant.profile as Record<string, unknown> | null) ?? {};
      const rawSkills = Array.isArray(profile.skills) ? profile.skills : [];
      const skills = rawSkills.map((s: unknown) =>
        typeof s === "string" ? s : typeof s === "object" && s !== null ? String((s as Record<string, unknown>).name ?? "") : ""
      ).filter(Boolean);

      let screeningScore: number | null = null;
      let recommendation: string | null = null;
      if (applicant.screeningId) {
        const screening = await ScreeningModel.findById(applicant.screeningId).lean();
        if (screening?.results) {
          const results = screening.results as Record<string, unknown>;
          const shortlist = Array.isArray(results.shortlist) ? results.shortlist : (results.ranked as unknown[] ?? []);
          const entry = shortlist.find((c) => {
            const cand = c as Record<string, unknown>;
            return String(cand.candidateId ?? cand.id) === applicantId;
          }) as Record<string, unknown> | undefined;
          if (entry) {
            screeningScore = Number(entry.totalScore ?? entry.score ?? null);
            recommendation = entry.recommendation ? String(entry.recommendation) : null;
          }
        }
      }

      return {
        id: String(applicant._id),
        name: extractApplicantName(applicant.profile),
        email: extractApplicantEmail(applicant.profile),
        title: typeof profile.title === "string" ? profile.title : null,
        status: applicant.status,
        source: applicant.source,
        jobId: String(applicant.jobId),
        jobTitle: job.title,
        skills,
        experience: Array.isArray(profile.experience) ? profile.experience : [],
        education: Array.isArray(profile.education) ? profile.education : [],
        location: typeof profile.location === "string" ? profile.location : null,
        screeningScore,
        recommendation,
        createdAt: applicant.createdAt,
      };
    }

    case "search_applicants_by_skill": {
      const skill = String(args.skill ?? "").trim();
      if (!skill) return { error: "skill is required." };
      const limit = Math.min(Number(args.limit ?? 30), 100);

      const jobs = await JobModel.find({ recruiterId, ...(args.jobId ? { _id: String(args.jobId) } : {}) }).select("_id title").lean();
      const jobIds = jobs.map((j) => j._id);
      const jobTitleById = new Map(jobs.map((j) => [String(j._id), j.title]));

      const applicants = await ApplicantModel.find({ jobId: { $in: jobIds } }).lean().limit(500);
      const skillRegex = new RegExp(skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

      const matches = applicants.filter((a) => {
        const profile = (a.profile as Record<string, unknown> | null) ?? {};
        const rawSkills = Array.isArray(profile.skills) ? profile.skills : [];
        return rawSkills.some((s: unknown) => {
          if (typeof s === "string") return skillRegex.test(s);
          if (typeof s === "object" && s !== null) {
            const sk = s as Record<string, unknown>;
            return skillRegex.test(String(sk.name ?? "")) || skillRegex.test(String(sk.level ?? ""));
          }
          return false;
        });
      });

      const limited = matches.slice(0, limit);
      return {
        skill,
        found: matches.length,
        returned: limited.length,
        results: limited.map((a) => ({
          id: String(a._id),
          name: extractApplicantName(a.profile),
          email: extractApplicantEmail(a.profile),
          status: a.status,
          source: a.source,
          jobId: String(a.jobId),
          jobTitle: jobTitleById.get(String(a.jobId)) ?? "Unknown job",
        })),
      };
    }

    case "list_screenings": {
      const filter: Record<string, unknown> = { recruiterId };
      if (args.status) filter.status = args.status;
      if (args.jobId) filter.jobId = args.jobId;
      const limit = Math.min(Number(args.limit ?? 10), 50);
      const screenings = await ScreeningModel.find(filter).lean().limit(limit).sort({ createdAt: -1 });
      return screenings.map((s) => ({
        id: String(s._id),
        jobId: String(s.jobId),
        status: s.status,
        totalEvaluated: s.totalEvaluated ?? 0,
        averageScore: s.averageScore ?? 0,
        createdAt: s.createdAt,
        durationMs: s.durationMs ?? null,
      }));
    }

    case "get_screening_results": {
      const screening = await ScreeningModel.findOne({ _id: args.screeningId, recruiterId }).lean();
      if (!screening) return { error: "Screening not found or access denied." };
      if (screening.status !== "completed") return { error: `Screening is not completed yet (status: ${screening.status}).` };

      const results = screening.results as Record<string, unknown> | null;
      const shortlist = Array.isArray(results?.shortlist) ? results!.shortlist : (results?.ranked as unknown[] ?? []);
      const limit = Math.min(Number(args.limit ?? 10), 20);
      const top = shortlist.slice(0, limit);

      return {
        screeningId: String(screening._id),
        totalEvaluated: screening.totalEvaluated ?? shortlist.length,
        averageScore: screening.averageScore ?? 0,
        shortlistSize: shortlist.length,
        topCandidates: top.map((c) => {
          const cand = c as Record<string, unknown>;
          return {
            rank: cand.rank,
            candidateId: cand.candidateId ?? cand.id,
            name: cand.name ?? cand.candidateName,
            totalScore: cand.totalScore ?? cand.score,
            recommendation: cand.recommendation,
            strengths: Array.isArray(cand.strengths) ? cand.strengths.slice(0, 2) : [],
            gaps: Array.isArray(cand.gaps) ? cand.gaps.slice(0, 2) : [],
          };
        }),
        meta: results?.meta ?? null,
      };
    }

    case "list_interviews": {
      const filter: Record<string, unknown> = { recruiterId };
      if (args.status) filter.status = args.status;
      const limit = Math.min(Number(args.limit ?? 10), 50);
      const interviews = await InterviewModel.find(filter).lean().limit(limit).sort({ createdAt: -1 });
      return interviews.map((i) => ({
        id: String(i._id),
        candidateName: i.candidateName,
        candidateEmail: i.candidateEmail,
        jobTitle: i.jobTitle,
        type: i.type,
        status: i.status,
        proposedSlots: i.proposedSlots ?? [],
        confirmedSlot: i.confirmedSlot ?? null,
        createdAt: i.createdAt,
      }));
    }

    case "cancel_interview": {
      const interviewId = String(args.interviewId ?? "").trim();
      if (!interviewId) return { error: "interviewId is required." };
      return cancelInterview(interviewId, recruiterId, args.reason ? String(args.reason) : undefined);
    }

    case "get_pipeline_summary": {
      const [activeJobs, totalJobs, totalApplicants, pendingScreenings, completedScreenings, upcomingInterviews] =
        await Promise.all([
          JobModel.countDocuments({ recruiterId, status: "active" }),
          JobModel.countDocuments({ recruiterId }),
          (async () => {
            const jobs = await JobModel.find({ recruiterId }).select("_id").lean();
            const jobIds = jobs.map((j) => j._id);
            return ApplicantModel.countDocuments({ jobId: { $in: jobIds } });
          })(),
          ScreeningModel.countDocuments({ recruiterId, status: { $in: ["queued", "running"] } }),
          ScreeningModel.countDocuments({ recruiterId, status: "completed" }),
          InterviewModel.countDocuments({ recruiterId, status: { $in: ["pending", "confirmed"] } }),
        ]);
      return {
        jobs: { active: activeJobs, total: totalJobs },
        applicants: { total: totalApplicants },
        screenings: { pending: pendingScreenings, completed: completedScreenings },
        interviews: { upcoming: upcomingInterviews },
      };
    }

    case "schedule_interview": {
      const slots = (args.proposedSlots as Array<{ start: string; end: string }>) ?? [];
      const recruiter = await UserModel.findById(recruiterId).lean();
      const applicantId = String(args.applicantId);
      const interview = await createInterview({
        recruiterId,
        candidateId: applicantId,
        applicantId,
        candidateName: String(args.candidateName),
        candidateEmail: String(args.candidateEmail),
        jobId: String(args.jobId),
        jobTitle: String(args.jobTitle),
        screeningId: args.screeningId ? String(args.screeningId) : undefined,
        title: args.title ? String(args.title) : `Interview: ${String(args.candidateName)}`,
        type: args.interviewType as "video" | "phone" | "in-person",
        proposedSlots: slots,
        meetingLink: args.meetingLink ? String(args.meetingLink) : undefined,
        notes: args.notes ? String(args.notes) : undefined,
        recruiterName: recruiter?.name ?? "Recruiter",
        recruiterEmail: recruiter?.email ?? "",
      });
      return {
        interviewId: String(interview._id),
        candidateName: interview.candidateName,
        status: interview.status,
        message: `Interview scheduled for ${interview.candidateName}. Invite email sent to ${interview.candidateEmail}.`,
      };
    }

    case "create_job": {
      const job = await JobModel.create({
        title: String(args.title),
        company: args.company ? String(args.company) : undefined,
        description: String(args.description),
        status: (args.status as "draft" | "active" | "closed" | undefined) ?? "active",
        recruiterId,
        requirements: {
          title: String(args.title),
          description: String(args.description),
          mustHaveSkills: Array.isArray(args.mustHaveSkills) ? args.mustHaveSkills.map(String) : [],
          niceToHaveSkills: Array.isArray(args.niceToHaveSkills) ? args.niceToHaveSkills.map(String) : [],
          minYearsExperience: Number(args.minYearsExperience ?? 0),
          educationLevel: (args.educationLevel as "none" | "certificate" | "bachelor" | "master" | "phd" | undefined) ?? "none",
          domain: args.domain ? String(args.domain) : "general",
          location: args.location ? String(args.location) : undefined,
          remoteAllowed: args.remoteAllowed === "yes",
          softSkills: Array.isArray(args.softSkills) ? args.softSkills.map(String) : [],
        },
      });
      return {
        jobId: String(job._id),
        title: job.title,
        status: job.status,
        message: `Job "${job.title}" created with status "${job.status}".`,
      };
    }

    case "update_job_status": {
      const job = await JobModel.findOneAndUpdate(
        { _id: String(args.jobId), recruiterId },
        { $set: { status: args.status as "draft" | "active" | "closed" } },
        { new: true },
      ).lean();
      if (!job) return { error: "Job not found or access denied." };
      return { jobId: String(job._id), title: job.title, status: job.status, message: `Job "${job.title}" status updated to "${job.status}".` };
    }

    case "update_job": {
      const jobId = String(args.jobId ?? "").trim();
      if (!jobId) return { error: "jobId is required." };

      const set: Record<string, unknown> = {};
      if (args.title !== undefined) set.title = String(args.title);
      if (args.description !== undefined) set.description = String(args.description);
      if (args.company !== undefined) set.company = String(args.company);
      if (args.domain !== undefined) set["requirements.domain"] = String(args.domain);
      if (args.location !== undefined) set["requirements.location"] = String(args.location);
      if (args.remoteAllowed !== undefined) set["requirements.remoteAllowed"] = args.remoteAllowed === "yes";
      if (args.minYearsExperience !== undefined) set["requirements.minYearsExperience"] = Number(args.minYearsExperience);
      if (args.educationLevel !== undefined) set["requirements.educationLevel"] = String(args.educationLevel);
      if (Array.isArray(args.mustHaveSkills)) set["requirements.mustHaveSkills"] = args.mustHaveSkills.map(String);
      if (Array.isArray(args.niceToHaveSkills)) set["requirements.niceToHaveSkills"] = args.niceToHaveSkills.map(String);

      if (Object.keys(set).length === 0) return { error: "No fields provided to update." };

      const job = await JobModel.findOneAndUpdate(
        { _id: jobId, recruiterId },
        { $set: set },
        { new: true },
      ).lean();
      if (!job) return { error: "Job not found or access denied." };

      return {
        jobId: String(job._id),
        title: job.title,
        status: job.status,
        message: `Job "${job.title}" updated successfully.`,
      };
    }

    case "approve_candidate": {
      const screening = await ScreeningModel.findOne({ _id: String(args.screeningId), recruiterId }).lean();
      if (!screening) return { error: "Screening not found or access denied." };

      const applicantId = String(args.applicantId);
      const decision = String(args.decision) as "approved" | "rejected" | "review";
      const hrNote = args.hrNote ? String(args.hrNote) : "";

      const existing = (screening.recruiterDecisions as Record<string, unknown> | null) ?? {};
      const updated = {
        ...(existing instanceof Map ? Object.fromEntries(existing) : existing),
        [applicantId]: { decision, hrNote, decidedAt: new Date().toISOString() },
      };

      await ScreeningModel.updateOne(
        { _id: String(args.screeningId) },
        { $set: { recruiterDecisions: updated } },
      );

      return {
        success: true,
        applicantId,
        decision,
        message: `Candidate marked as "${decision}" in screening ${String(args.screeningId)}.`,
      };
    }

    case "ingest_resume": {
      const jobId = String(args.jobId ?? "").trim();
      const resumeText = String(args.resumeText ?? "").trim();
      if (!jobId) return { error: "jobId is required." };
      if (resumeText.length < 20) return { error: "resumeText is too short to parse a resume." };

      // Idempotency: same resume text + same job in this session → return cached applicant
      const ingestCacheKey = `ingest_resume:${jobId}:${resumeText.slice(0, 200)}`;
      if (sessionCache.has(ingestCacheKey)) return sessionCache.get(ingestCacheKey);

      const job = await JobModel.findOne({ _id: jobId, recruiterId }).lean();
      if (!job) return { error: "Job not found or access denied." };

      // Tier 1: pre-parsed profile cached by extractTextHandler (pdfplumber quality, no re-parse needed)
      // Tier 2: Python normalise/text (same normalise_prompt.py, but fed pdf-parse text)
      // Tier 3: Node Gemini + mergeGeminiResume
      // Tier 4: heuristics only
      let profile: Record<string, unknown>;
      const cachedProfile = getCachedParsedProfile(resumeText);
      if (cachedProfile) {
        // Already fully parsed by pdfplumber + Gemini in extractTextHandler — just stamp a new id
        profile = { ...cachedProfile, id: randomUUID() };
      } else try {
        if (env.AI_SERVICE_URL) {
          const parsed = await normaliseText(resumeText);
          const base = pythonProfileToUmurava(parsed);
          profile = normalizeProfile({
            ...base,
            id: randomUUID(),
            headline: parsed.headline,
            bio: parsed.bio ?? undefined,
            projects: (parsed.projects ?? []).map((p) => ({
              name: p.name,
              description: p.description,
              technologies: p.technologies,
              role: p.role,
              link: p.link,
              startDate: p.startDate,
              endDate: p.endDate,
            })),
            availability: parsed.availability,
            socialLinks: parsed.socialLinks ?? undefined,
          }) as unknown as Record<string, unknown>;
        } else {
          const g = await callGeminiWithRetry(buildResumeExtractionPrompt(resumeText), ZodResumeGeminiExtraction) as Record<string, unknown>;
          profile = normalizeProfile({ ...mergeGeminiResume(resumeText, g), id: randomUUID() }) as unknown as Record<string, unknown>;
        }
      } catch {
        profile = normalizeProfile({ ...heuristicExtractResume(resumeText), id: randomUUID() }) as unknown as Record<string, unknown>;
      }

      const applicant = await ApplicantModel.create({
        jobId,
        source: "pdf_upload",
        profile,
        rawText: resumeText.slice(0, 10000),
        status: "pending",
      });

      const ingestResult = {
        applicantId: String(applicant._id),
        name: `${String(profile.firstName ?? "")} ${String(profile.lastName ?? "")}`.trim() || "Unknown",
        email: profile.email ?? null,
        title: profile.title ?? null,
        skills: Array.isArray(profile.skills) ? (profile.skills as string[]).slice(0, 8) : [],
        message: `Resume ingested and added as applicant for "${job.title}". You can now call run_screening to rank all candidates.`,
      };
      sessionCache.set(ingestCacheKey, ingestResult);
      return ingestResult;
    }

    case "run_screening": {
      const jobId = String(args.jobId ?? "").trim();
      if (!jobId) return { error: "jobId is required." };
      const shortlistSize = args.shortlistSize === 20 ? 20 : 10;
      // Idempotency: return the cached result if this job was already screened this session
      const screeningCacheKey = `run_screening:${jobId}`;
      if (sessionCache.has(screeningCacheKey)) return sessionCache.get(screeningCacheKey);
      try {
        const result = await runScreeningForJobAgent({ jobId, recruiterId, shortlistSize });
        const payload = {
          screeningId: result.screeningId,
          jobTitle: result.jobTitle,
          totalEvaluated: result.totalEvaluated,
          averageScore: result.averageScore,
          shortlistCount: result.shortlistCount,
          topCandidates: result.shortlist.map((c) => ({
            rank: c.rank,
            name: c.name,
            email: c.email,
            totalScore: c.totalScore,
            recommendation: c.recommendation,
            strengths: c.strengths.slice(0, 3),
            gaps: c.gaps.slice(0, 2),
            mustHaveSkillsMet: c.mustHaveSkillsMet,
            mustHaveSkillsMissing: c.mustHaveSkillsMissing,
            hiringRisk: (c as unknown as Record<string, unknown>).hiringRisk ?? null,
          })),
        };
        sessionCache.set(screeningCacheKey, payload);
        return payload;
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Screening failed." };
      }
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

const AGENT_MAX_ITERATIONS = 10;
const AGENT_TIMEOUT_MS = 120_000;
const AGENT_MAX_REPEAT_CALLS = 2;

/** Stable key for detecting repeated identical tool calls. */
function toolCallKey(name: string, args: Record<string, unknown>): string {
  return `${name}:${JSON.stringify(args, Object.keys(args).sort())}`;
}

/** Builds a human-readable summary of what the agent completed, for use in fallback replies. */
function buildExhaustionReply(toolCalls: ToolCall[]): string {
  const done = toolCalls.map((t) => t.name);
  const unique = [...new Set(done)];
  return (
    `I completed the following actions: ${unique.join(", ")}. ` +
    `Please check the results in the screening dashboard or ask me a specific follow-up question.`
  );
}

/**
 * Run the agent chat loop via the Python AI service (preferred path).
 * Python owns the Gemini call; Node executes tools and manages the contents array.
 */
async function runAgentChatViaPython(
  message: string,
  history: AgentMessage[],
  recruiterId: string,
): Promise<{ reply: string; toolCalls: ToolCall[] }> {
  const contents: AgentContent[] = history.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));
  contents.push({ role: "user", parts: [{ text: message }] });

  const toolCalls: ToolCall[] = [];
  const callCounts = new Map<string, number>();
  const sessionCache = new Map<string, unknown>();
  const deadline = Date.now() + AGENT_TIMEOUT_MS;

  for (let iteration = 0; iteration < AGENT_MAX_ITERATIONS; iteration++) {
    if (Date.now() > deadline) {
      return { reply: buildExhaustionReply(toolCalls), toolCalls };
    }

    const turn = await agentTurn({ contents });

    if (turn.type === "text") {
      return { reply: turn.reply, toolCalls };
    }

    // Detect repeated identical calls — inject a stop signal instead of executing again
    const repeated = turn.calls.filter((c) => {
      const key = toolCallKey(c.name, c.args);
      const count = (callCounts.get(key) ?? 0) + 1;
      callCounts.set(key, count);
      return count > AGENT_MAX_REPEAT_CALLS;
    });
    if (repeated.length > 0) {
      const names = repeated.map((c) => c.name).join(", ");
      contents.push({
        role: "user",
        parts: [{ text: `You have already called ${names} with the same arguments. Stop looping and give your final answer based on what you already know.` }],
      });
      continue;
    }

    contents.push({
      role: "model",
      parts: turn.calls.map((c) => ({ function_call: { name: c.name, args: c.args } })),
    });

    const responseParts = await Promise.all(
      turn.calls.map(async (fc) => {
        let result: unknown;
        try {
          result = await executeTool(fc.name, fc.args, recruiterId, sessionCache);
        } catch (toolErr) {
          result = { error: toolErr instanceof Error ? toolErr.message : String(toolErr) };
        }
        toolCalls.push({ name: fc.name, args: fc.args, result });
        return { function_response: { name: fc.name, response: { result } } };
      }),
    );

    contents.push({ role: "user", parts: responseParts });
  }

  // Iterations exhausted — request a text summary rather than making another tool-call turn
  contents.push({
    role: "user",
    parts: [{ text: "Please summarise what you have done so far and provide your final answer. Do not call any more tools." }],
  });
  const finalTurn = await agentTurn({ contents });
  return {
    reply: finalTurn.type === "text" ? finalTurn.reply : buildExhaustionReply(toolCalls),
    toolCalls,
  };
}

/**
 * Fallback: run the agent loop in-process using the @google/generative-ai SDK.
 * Used when AI_SERVICE_URL is not configured.
 */
async function runAgentChatInProcess(
  message: string,
  history: AgentMessage[],
  recruiterId: string,
): Promise<{ reply: string; toolCalls: ToolCall[] }> {
  // Use only models known to support function calling with the v1 API.
  // gemini-2.5-flash-lite does NOT support tools/systemInstruction in v1 — skip it.
  let chatModel = genAI.getGenerativeModel(
    {
      model: AGENT_CAPABLE_MODELS[0]!,
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: agentTools,
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    },
    { apiVersion: "v1beta" }, // tools/toolConfig/systemInstruction require v1beta — not available in v1
  );

  const chat = chatModel.startChat({
    history: history.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
  });

  const toolCalls: ToolCall[] = [];
  const callCounts = new Map<string, number>();
  const sessionCache = new Map<string, unknown>();
  const deadline = Date.now() + AGENT_TIMEOUT_MS;
  let response = await chat.sendMessage(message);

  for (let iteration = 0; iteration < AGENT_MAX_ITERATIONS; iteration++) {
    if (Date.now() > deadline) {
      return { reply: buildExhaustionReply(toolCalls), toolCalls };
    }

    const fns = response.response.functionCalls();
    if (!fns || fns.length === 0) break;

    // Detect repeated identical calls
    const toExecute = fns.filter((fc) => {
      const args = (fc.args ?? {}) as Record<string, unknown>;
      const key = toolCallKey(fc.name, args);
      const count = (callCounts.get(key) ?? 0) + 1;
      callCounts.set(key, count);
      return count <= AGENT_MAX_REPEAT_CALLS;
    });

    if (toExecute.length === 0) {
      try {
        response = await chat.sendMessage("You have already called these tools with the same arguments. Stop looping and give your final answer.");
      } catch { break; }
      continue;
    }

    const parts = await Promise.all(
      toExecute.map(async (fc) => {
        const args = (fc.args ?? {}) as Record<string, unknown>;
        let result: unknown;
        try {
          result = await executeTool(fc.name, args, recruiterId, sessionCache);
        } catch (toolErr) {
          result = { error: toolErr instanceof Error ? toolErr.message : String(toolErr) };
        }
        toolCalls.push({ name: fc.name, args, result });
        return { functionResponse: { name: fc.name, response: { result } } };
      }),
    );

    try {
      response = await chat.sendMessage(parts);
    } catch (sendErr) {
      const errMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error(`[runAgentChatInProcess] sendMessage after tool execution failed: ${errMsg}`);
      return {
        reply: `I completed the following but couldn't generate a summary: ${toolCalls.map((t) => t.name).join(", ")}. Gemini error: ${errMsg}`,
        toolCalls,
      };
    }
  }

  let reply: string;
  try {
    reply = response.response.text();
    if (!reply) reply = buildExhaustionReply(toolCalls);
  } catch {
    reply = buildExhaustionReply(toolCalls);
  }

  return { reply, toolCalls };
}

export async function runAgentChat(
  message: string,
  history: AgentMessage[],
  recruiterId: string,
): Promise<{ reply: string; toolCalls: ToolCall[] }> {
  if (env.AI_SERVICE_URL) {
    try {
      return await runAgentChatViaPython(message, history, recruiterId);
    } catch (err) {
      // If the Python service is down, fall back to in-process SDK
      if (err instanceof AiServiceError && err.code === "AI_SERVICE_UNCONFIGURED") throw err;
      const reason = err instanceof AiServiceError ? `${err.code}: ${err.message}` : String(err);
      console.warn(`[runAgentChat] Python service failed — falling back to in-process SDK. Reason: ${reason}`);
    }
  }
  try {
    return await runAgentChatInProcess(message, history, recruiterId);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error(`[runAgentChat] In-process SDK also failed: ${reason}`);
    throw new Error(`Gemini API error: ${reason}`);
  }
}
