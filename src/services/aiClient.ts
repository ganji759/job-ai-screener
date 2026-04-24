/**
 * HTTP client for the Python AI service (`backend/apps/ai`).
 *
 * Per AI_ML.md / BACKEND.md, Python owns:
 *   - POST /normalise/pdf   — pdfplumber + Gemini PDF → ParsedProfile
 *   - POST /normalise/text  — Gemini-only text      → ParsedProfile
 *   - POST /screening/run   — batched candidate screening (composite score, dimensions, rank)
 *   - POST /ai/generate     — thin Gemini proxy (used by the rest of Node for custom prompts)
 *
 * All endpoints expect Python-shape JSON (snake_case for screening; camelCase for ParsedProfile).
 * Callers in Node should use the adapter helpers in `pythonAdapter.ts` to convert to/from the
 * Node-internal `UmuravaProfile` / `CandidateResult` types the frontend already consumes.
 */
import { env } from "../config/env";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export class AiServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = "AiServiceError";
  }
}

/** Throws with a classified error when the service is unreachable or returns non-2xx. */
const ensureConfigured = (): string => {
  if (!env.AI_SERVICE_URL) {
    throw new AiServiceError(
      503,
      "AI_SERVICE_UNCONFIGURED",
      "AI_SERVICE_URL is not set. Start backend/apps/ai and configure AI_SERVICE_URL in backend/.env.",
    );
  }
  return env.AI_SERVICE_URL.replace(/\/$/, "");
};

const readErrorDetail = async (response: Response): Promise<{ code: string; message: string }> => {
  try {
    const body = (await response.json()) as { detail?: { code?: string; message?: string } | string };
    if (typeof body.detail === "string") {
      return { code: `HTTP_${response.status}`, message: body.detail };
    }
    return {
      code: body.detail?.code ?? `HTTP_${response.status}`,
      message: body.detail?.message ?? response.statusText,
    };
  } catch {
    return { code: `HTTP_${response.status}`, message: response.statusText };
  }
};

const timedFetch = async (
  url: string,
  init: RequestInit & { timeoutMs: number },
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// -------------------------------------------------------------------------------------------------
// /ai/generate  (thin Gemini proxy — used by callGeminiWithRetry in gemini.service.ts)
// -------------------------------------------------------------------------------------------------
export async function aiGenerate(prompt: string, timeoutMs: number): Promise<string> {
  const base = ensureConfigured();
  const response = await timedFetch(`${base}/ai/generate`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ prompt, timeoutMs }),
    timeoutMs: timeoutMs + env.AI_SERVICE_TIMEOUT_BUFFER_MS,
  });

  if (!response.ok) {
    const { code, message } = await readErrorDetail(response);
    throw new AiServiceError(response.status, code, message);
  }

  const body = (await response.json()) as { text?: string };
  if (!body.text) throw new AiServiceError(502, "EMPTY_RESPONSE", "Python AI service returned empty text");
  return body.text;
}

// -------------------------------------------------------------------------------------------------
// /normalise/pdf  (pdfplumber + Gemini → ParsedProfile)
// -------------------------------------------------------------------------------------------------
export type PythonParsedProfile = {
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string | null;
  location: string;
  skills: { name: string; level: "Beginner" | "Intermediate" | "Advanced" | "Expert"; yearsOfExperience: number }[];
  languages?: { name: string; proficiency: "Basic" | "Conversational" | "Fluent" | "Native" }[];
  experience: {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    technologies?: string[];
    isCurrent: boolean;
  }[];
  education: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: number;
    endYear: number;
  }[];
  certifications?: { name: string; issuer: string; issueDate: string }[];
  projects: {
    name: string;
    description: string;
    technologies?: string[];
    role: string;
    link?: string | null;
    startDate: string;
    endDate: string;
  }[];
  availability: {
    status: "Available" | "Open to Opportunities" | "Not Available";
    type: "Full-time" | "Part-time" | "Contract";
    startDate?: string | null;
  };
  socialLinks?: { linkedin?: string | null; github?: string | null; portfolio?: string | null } | null;
};

export async function normalisePdf(
  file: { buffer: Buffer; filename: string; mimetype?: string },
  timeoutMs = env.GEMINI_TIMEOUT_MS,
): Promise<PythonParsedProfile> {
  const base = ensureConfigured();
  const form = new FormData();
  const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype ?? "application/pdf" });
  form.append("file", blob, file.filename);

  const response = await timedFetch(`${base}/normalise/pdf`, {
    method: "POST",
    body: form,
    timeoutMs: timeoutMs + env.AI_SERVICE_TIMEOUT_BUFFER_MS,
  });

  if (!response.ok) {
    const { code, message } = await readErrorDetail(response);
    throw new AiServiceError(response.status, code, message);
  }
  return (await response.json()) as PythonParsedProfile;
}

export async function normaliseText(
  rawText: string,
  timeoutMs = env.GEMINI_TIMEOUT_MS,
): Promise<PythonParsedProfile> {
  const base = ensureConfigured();
  const response = await timedFetch(`${base}/normalise/text`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ text: rawText }),
    timeoutMs: timeoutMs + env.AI_SERVICE_TIMEOUT_BUFFER_MS,
  });

  if (!response.ok) {
    const { code, message } = await readErrorDetail(response);
    throw new AiServiceError(response.status, code, message);
  }
  return (await response.json()) as PythonParsedProfile;
}

// -------------------------------------------------------------------------------------------------
// /screening/run  (batched candidate screening)
// -------------------------------------------------------------------------------------------------
export type PythonScreeningJob = {
  _id: string;
  title: string;
  description: string;
  requirements: {
    skills: string[];
    experience_years: number;
    education_level: string;
    nice_to_have: string[];
  };
  scoring_weights: { skills: number; experience: number; education: number; cultural_fit: number };
};

export type PythonScreeningRequest = {
  run_id: string;
  job: PythonScreeningJob;
  applicants: { _id: string; parsed_profile: PythonParsedProfile }[];
};

export type PythonRankedResult = {
  applicant_id: string;
  rank: number;
  composite_score: number;
  dimension_scores: { skills: number; experience: number; education: number; cultural_fit: number };
  strengths: string[];
  gaps: string[];
  recommendation: "Strong hire" | "Consider" | "Reject";
};

export type PythonScreeningResponse = {
  run_id: string;
  results: PythonRankedResult[];
};

export async function runScreening(
  req: PythonScreeningRequest,
  timeoutMs = Math.max(env.GEMINI_TIMEOUT_MS, 60_000),
): Promise<PythonScreeningResponse> {
  const base = ensureConfigured();
  const response = await timedFetch(`${base}/screening/run`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(req),
    timeoutMs: timeoutMs + env.AI_SERVICE_TIMEOUT_BUFFER_MS,
  });

  if (!response.ok) {
    const { code, message } = await readErrorDetail(response);
    throw new AiServiceError(response.status, code, message);
  }
  return (await response.json()) as PythonScreeningResponse;
}

export async function aiHealth(): Promise<boolean> {
  if (!env.AI_SERVICE_URL) return false;
  try {
    const response = await timedFetch(`${env.AI_SERVICE_URL.replace(/\/$/, "")}/health`, {
      method: "GET",
      timeoutMs: 3_000,
    });
    return response.ok;
  } catch {
    return false;
  }
}
