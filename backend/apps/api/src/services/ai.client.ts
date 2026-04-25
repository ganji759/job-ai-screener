import axios, { type AxiosInstance } from "axios";
import FormData from "form-data";
import { logger } from "../lib/logger.js";

const aiClient: AxiosInstance = axios.create({
  baseURL: process.env.AI_SERVICE_URL ?? "http://localhost:8000",
  timeout: 120_000, // AI batches can take up to 2 min
  headers: { "Content-Type": "application/json" },
});

aiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    logger.error({ err: err.response?.data ?? err.message }, "ai_service_error");
    return Promise.reject(err);
  }
);

export interface ScreeningRequest {
  run_id: string;
  job: object;        // full job document (lean)
  applicants: object[]; // { _id, parsed_profile }[]
}

export interface RankedResult {
  applicant_id: string;
  rank: number;
  composite_score: number;
  dimension_scores: {
    skills: number;
    experience: number;
    education: number;
    cultural_fit: number;
  };
  strengths: string[];
  gaps: string[];
  recommendation: "Strong hire" | "Consider" | "Reject";
}

export async function runAiScreening(
  req: ScreeningRequest
): Promise<{ run_id: string; results: RankedResult[] }> {
  const { data } = await aiClient.post<{ run_id: string; results: RankedResult[] }>(
    "/screening/run",
    req
  );
  return data;
}

export async function normalisePdf(buffer: Buffer, filename: string): Promise<object> {
  const form = new FormData();
  form.append("file", buffer, { filename, contentType: "application/pdf" });
  const { data } = await aiClient.post<object>("/normalise/pdf", form, {
    headers: form.getHeaders(),
  });
  return data; // ParsedProfile
}

export async function normaliseText(text: string): Promise<object> {
  const { data } = await aiClient.post<object>("/normalise/text", { text });
  return data; // ParsedProfile
}
