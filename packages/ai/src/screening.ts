import { flashModel, callWithRetry } from "./client";
import { buildScreeningPrompt } from "./prompts/screen.prompt";
import { BatchEvalOutput, CandidateEval } from "./schemas";
import { mergeAndRank } from "./merger";
import type { Job, Applicant } from "../../db/src/types";

const BATCH_SIZE = 25; // max candidates per Gemini call

interface RunScreeningOptions {
  job: Job;
  applicants: Applicant[];
  runId: string;
  onBatchComplete?: (done: number, total: number) => Promise<void>;
}

export interface ScreeningResultDoc {
  screening_run_id: string;
  job_id: string;
  applicant_id: string;
  rank: number;
  composite_score: number;
  dimension_scores: {
    skills: number;
    experience: number;
    education: number;
    cultural_fit: number;
  };
  reasoning: {
    strengths: string[];
    gaps: string[];
    recommendation: "Strong hire" | "Consider" | "Reject";
  };
  model_version: string;
}

export async function runScreening({
  job, applicants, runId, onBatchComplete,
}: RunScreeningOptions): Promise<ScreeningResultDoc[]> {
  const batches = chunk(applicants, BATCH_SIZE);
  const allEvals: (CandidateEval & { applicant_id: string })[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const evals = process.env.AI_MOCK_MODE === "true" 
      ? mockEvaluateBatch(batch)
      : await evaluateBatch(job, batch);

    // tag each eval with the real applicant _id
    evals.forEach((e, idx) => {
      if (batch[e.candidate_index]) {
        allEvals.push({ ...e, applicant_id: batch[e.candidate_index]._id.toString() });
      }
    });

    await onBatchComplete?.(i + 1, batches.length);
  }

  const ranked = mergeAndRank(allEvals);

  // Build results array to return (caller persists to DB)
  return ranked.map((r, idx) => ({
    screening_run_id: runId,
    job_id: job._id.toString(),
    applicant_id: r.applicant_id,
    rank: idx + 1,
    composite_score: r.composite_score,
    dimension_scores: r.dimension_scores,
    reasoning: {
      strengths: r.strengths,
      gaps: r.gaps,
      recommendation: r.recommendation,
    },
    model_version: "gemini-1.5-flash",
  }));
}

function mockEvaluateBatch(batch: Applicant[]): CandidateEval[] {
  return batch.map((_, index) => ({
    candidate_index: index,
    dimension_scores: {
      skills: Math.floor(Math.random() * 40) + 60,
      experience: Math.floor(Math.random() * 40) + 60,
      education: Math.floor(Math.random() * 40) + 60,
      cultural_fit: Math.floor(Math.random() * 40) + 60,
    },
    composite_score: Math.floor(Math.random() * 30) + 70,
    strengths: ["Strong technical match (Mock)", "Good communication"],
    gaps: ["No major gaps identified"],
    recommendation: "Strong hire"
  }));
}

async function evaluateBatch(job: Job, batch: Applicant[]): Promise<CandidateEval[]> {
  const profiles = batch.map(a => a.parsed_profile);
  const prompt = buildScreeningPrompt(job, profiles);

  const result = await callWithRetry(() => flashModel.generateContent(prompt));
  const raw = result.response.text();

  const parsed = BatchEvalOutput.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    // Retry once before failing
    const retry = await callWithRetry(() => flashModel.generateContent(prompt));
    const retryParsed = BatchEvalOutput.parse(JSON.parse(retry.response.text()));
    return retryParsed.evaluations;
  }

  return parsed.data.evaluations;
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, (i + 1) * size)
  );
}