import { GoogleGenerativeAI, FunctionCallingMode, SchemaType } from "@google/generative-ai";
import type { FunctionDeclaration, Tool } from "@google/generative-ai";
import { env } from "../config/env";
import { JobModel } from "../models/Job.model";
import { ApplicantModel } from "../models/Applicant.model";
import { ScreeningModel } from "../models/Screening.model";
import { InterviewModel } from "../models/Interview.model";
import { UserModel } from "../models/User.model";
import { createInterview } from "./interview.service";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);

export type AgentMessage = { role: "user" | "model"; content: string };
export type ToolCall = { name: string; args: Record<string, unknown>; result: unknown };

const SYSTEM_INSTRUCTION = `You are an AI hiring assistant for the Umurava HR platform. You help recruiters manage their hiring pipeline efficiently.

You have access to tools that let you query jobs, applicants, screenings, interviews, and analytics in real time — and even schedule interviews.

Guidelines:
- Always use tools to fetch live data before answering questions about specific jobs, candidates, or screenings.
- Present data clearly and concisely. Use bullet points or short tables when listing multiple items.
- When you schedule an interview, confirm the details with the recruiter before calling the tool.
- Never invent data — if a tool returns no results, say so.
- Keep responses professional and focused on helping the recruiter make good hiring decisions.`;

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
    description: "List applicants for a specific job with their source and status.",
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

const agentTools: Tool[] = [{ functionDeclarations }];

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
        name: (a.profile as Record<string, unknown>)?.name ?? (a.profile as Record<string, unknown>)?.fullName ?? "Unknown",
        email: (a.profile as Record<string, unknown>)?.email ?? null,
        createdAt: a.createdAt,
      }));
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

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function runAgentChat(
  message: string,
  history: AgentMessage[],
  recruiterId: string,
): Promise<{ reply: string; toolCalls: ToolCall[] }> {
  const model = genAI.getGenerativeModel(
    {
      model: env.GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      tools: agentTools,
      toolConfig: { functionCallingConfig: { mode: FunctionCallingMode.AUTO } },
    },
    { apiVersion: env.GEMINI_API_VERSION },
  );

  const chat = model.startChat({
    history: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  });

  const toolCalls: ToolCall[] = [];
  let response = await chat.sendMessage(message);

  for (let iteration = 0; iteration < 5; iteration++) {
    const fns = response.response.functionCalls();
    if (!fns || fns.length === 0) break;

    const parts = await Promise.all(
      fns.map(async (fc) => {
        const args = (fc.args ?? {}) as Record<string, unknown>;
        const result = await executeTool(fc.name, args, recruiterId);
        toolCalls.push({ name: fc.name, args, result });
        return {
          functionResponse: {
            name: fc.name,
            response: { result },
          },
        };
      }),
    );

    response = await chat.sendMessage(parts);
  }

  return { reply: response.response.text(), toolCalls };
}
