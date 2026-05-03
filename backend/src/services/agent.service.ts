import { GoogleGenerativeAI, FunctionCallingMode, SchemaType } from "@google/generative-ai";
import type { FunctionDeclaration, Tool } from "@google/generative-ai";
import { env } from "../config/env";
import { agentTurn, AiServiceError } from "./aiClient";
import type { AgentContent } from "./aiClient";
import { JobModel } from "../models/Job.model";
import { ApplicantModel } from "../models/Applicant.model";
import { ScreeningModel } from "../models/Screening.model";
import { InterviewModel } from "../models/Interview.model";
import { UserModel } from "../models/User.model";
import { createInterview } from "./interview.service";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export type AgentMessage = { role: "user" | "model"; content: string };
export type ToolCall = { name: string; args: Record<string, unknown>; result: unknown };

const SYSTEM_INSTRUCTION = `You are an AI hiring assistant for the Umurava HR platform. You help recruiters manage their entire hiring pipeline hands-free.

You have tools to query jobs, applicants, screenings, and interviews in real time — and can schedule interviews directly.

Critical rules — follow these strictly:
- NEVER ask the recruiter for an ID. IDs are internal database keys. Always look them up yourself using tools before doing anything that needs an ID.
  - Need a job ID? → call list_jobs first.
  - Need an applicant ID or email? → call search_applicants (by name) or get_applicants (by jobId).
  - Need a screening ID? → call list_screenings first.
- NEVER say "I cannot search the database" — you have tools that can. Use them.
- Chain tool calls automatically. For example: if the recruiter says "schedule an interview for John Smith", first call search_applicants to find John, then call schedule_interview with the data you found. If the recruiter says "accept/approve/reject a candidate", first call search_applicants to get their applicantId, then list_screenings to get the screeningId, then call approve_candidate.
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

    default:
      return { error: `Unknown tool: ${name}` };
  }
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
  // Build Gemini-format contents from conversation history
  const contents: AgentContent[] = history.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  // Append the new user message
  contents.push({ role: "user", parts: [{ text: message }] });

  const toolCalls: ToolCall[] = [];

  for (let iteration = 0; iteration < 5; iteration++) {
    const turn = await agentTurn({ contents });

    if (turn.type === "text") {
      return { reply: turn.reply, toolCalls };
    }

    // Model wants to call tools — append model's function-call parts to contents
    contents.push({
      role: "model",
      parts: turn.calls.map((c) => ({ function_call: { name: c.name, args: c.args } })),
    });

    // Execute each tool in Node, collect responses
    const responseParts = await Promise.all(
      turn.calls.map(async (fc) => {
        let result: unknown;
        try {
          result = await executeTool(fc.name, fc.args, recruiterId);
        } catch (toolErr) {
          result = { error: toolErr instanceof Error ? toolErr.message : String(toolErr) };
        }
        toolCalls.push({ name: fc.name, args: fc.args, result });
        return { function_response: { name: fc.name, response: { result } } };
      }),
    );

    // Append function responses as a user turn (Gemini protocol)
    contents.push({ role: "user", parts: responseParts });
  }

  // Exhausted iterations without a text reply — ask for a summary
  const finalTurn = await agentTurn({ contents });
  return {
    reply: finalTurn.type === "text"
      ? finalTurn.reply
      : `Completed ${toolCalls.map((t) => t.name).join(", ")}.`,
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
  let response = await chat.sendMessage(message);

  for (let iteration = 0; iteration < 5; iteration++) {
    const fns = response.response.functionCalls();
    if (!fns || fns.length === 0) break;

    const parts = await Promise.all(
      fns.map(async (fc) => {
        const args = (fc.args ?? {}) as Record<string, unknown>;
        let result: unknown;
        try {
          result = await executeTool(fc.name, args, recruiterId);
        } catch (toolErr) {
          result = { error: toolErr instanceof Error ? toolErr.message : String(toolErr) };
        }
        toolCalls.push({ name: fc.name, args, result });
        return { functionResponse: { name: fc.name, response: { result } } };
      }),
    );

    response = await chat.sendMessage(parts);
  }

  let reply: string;
  try {
    reply = response.response.text();
  } catch {
    reply = toolCalls.length > 0
      ? `Completed: ${toolCalls.map((t) => t.name).join(", ")}.`
      : "No response generated.";
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
  return runAgentChatInProcess(message, history, recruiterId);
}
