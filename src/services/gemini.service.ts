import { GoogleGenerativeAI } from "@google/generative-ai";
import { z, type ZodSchema } from "zod";
import { env } from "../config/env";
import type {
  CandidateResult,
  JobRequirements,
  PlatformCandidateResult,
  PoolInsights,
  TalentProfile,
  UmuravaProfile,
} from "../types";
import {
  buildCompareCandidatesPrompt,
  buildExtractRequirementsPrompt,
  buildPoolInsightsPrompt,
  buildScoreCandidatesPrompt,
  buildUmuravaPlatformScoreCandidatesPrompt,
} from "../utils/promptBuilder";
import {
  ZodCandidateResultArray,
  ZodJobRequirements,
  ZodPlatformCandidateResultArray,
  ZodPoolInsights,
} from "../utils/jsonValidator";
import {
  computeWeightedScore,
  normalizePlatformCandidateScores,
  sortAndRankCandidates,
  sortAndRankPlatformCandidates,
} from "./scoring.service";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL }, { apiVersion: env.GEMINI_API_VERSION });

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export type GeminiRetryOptions = {
  /** HTTP timeout passed to `@google/generative-ai` generateContent */
  timeoutMs?: number;
};

/** Maps quota / billing / timeout SDK errors to a concise recruiter-facing message. */
export function formatGeminiUserError(err: unknown, timeoutMsUsed = env.GEMINI_TIMEOUT_MS): string {
  const raw = String(err);
  if (/AbortError|timed out|timeout|Deadline|ETIMEDOUT|408/i.test(raw)) {
    return `Gemini request timed out after ${timeoutMsUsed / 1000}s. Try again; tune GEMINI_PLATFORM_* or GEMINI_TIMEOUT_MS if needed.`;
  }
  if (/429|RESOURCE_EXHAUSTED|quota|Quota exceeded|exceeded your current quota|billing|rate limit|too many requests/i.test(raw)) {
    return (
      "Gemini API quota or rate limit was exceeded for this project or model. " +
      "Try again in a few minutes, verify billing and quotas in Google AI Studio, " +
      `or change GEMINI_MODEL (currently ${env.GEMINI_MODEL}).`
    );
  }
  return raw.length > 800 ? `${raw.slice(0, 800)}…` : raw;
}

export const callGeminiWithRetry = async <T>(
  prompt: string,
  schema: ZodSchema<T>,
  retries = 3,
  opts?: GeminiRetryOptions,
): Promise<T> => {
  const timeoutMs = opts?.timeoutMs ?? env.GEMINI_TIMEOUT_MS;
  let lastRaw = "";
  for (let i = 0; i < retries; i += 1) {
    try {
      const result = await model.generateContent(prompt, { timeout: timeoutMs });
      const text = result.response.text();
      lastRaw = text;
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      return schema.parse(parsed);
    } catch (error) {
      if (i === retries - 1) {
        const hint = formatGeminiUserError(error, timeoutMs);
        throw new Error(
          hint.startsWith("Gemini API quota")
            ? hint
            : `Gemini failed after ${retries} retries. ${hint}${lastRaw ? ` (last model output length: ${lastRaw.length})` : ""}`,
        );
      }
      await wait(5000 * (2 ** i));
    }
  }
  throw new Error("Unexpected Gemini retry state");
};

export const extractJobRequirements = async (rawDescription: string): Promise<JobRequirements> => {
  const prompt = buildExtractRequirementsPrompt(rawDescription);
  const data = await callGeminiWithRetry(prompt, ZodJobRequirements);
  return { ...data, title: data.title ?? "Untitled Role", description: rawDescription };
};

export const scoreAllCandidates = async (job: JobRequirements, candidates: UmuravaProfile[], batchSize = 20): Promise<CandidateResult[]> => {
  const batches: UmuravaProfile[][] = [];
  for (let i = 0; i < candidates.length; i += batchSize) batches.push(candidates.slice(i, i + batchSize));

  const settled = await Promise.allSettled(
    batches.map(async (batch) => {
      const prompt = buildScoreCandidatesPrompt(job, batch);
      const result = await callGeminiWithRetry(prompt, ZodCandidateResultArray);
      return result.map((item) => {
        const normalized: CandidateResult = {
          ...item,
          rank: 0,
          strengths: item.strengths.slice(0, 3),
          gaps: item.gaps.slice(0, 2),
          recommendation: item.recommendation.trim(),
        };
        return { ...normalized, totalScore: computeWeightedScore(normalized) };
      });
    }),
  );

  const merged: CandidateResult[] = [];
  settled.forEach((entry) => {
    if (entry.status === "fulfilled") merged.push(...entry.value);
  });

  return sortAndRankCandidates(merged);
};

/** Scenario 1 — Umurava rubric; sequential batches sized from env + hard wall-clock budget. */
export const scoreUmuravaPlatformCandidates = async (
  job: JobRequirements,
  candidates: TalentProfile[],
): Promise<PlatformCandidateResult[]> => {
  const batchSize = env.GEMINI_PLATFORM_BATCH_SIZE;
  const batches: TalentProfile[][] = [];
  for (let i = 0; i < candidates.length; i += batchSize) {
    batches.push(candidates.slice(i, i + batchSize));
  }

  const merged: PlatformCandidateResult[] = [];
  const wallDeadline = Date.now() + env.GEMINI_PLATFORM_WALL_MS;

  for (let b = 0; b < batches.length; b += 1) {
    if (Date.now() >= wallDeadline) {
      throw new Error(
        `Umurava platform scoring exceeded wall-time budget (${env.GEMINI_PLATFORM_WALL_MS / 1000}s). ` +
          `Raise GEMINI_PLATFORM_WALL_MS, increase GEMINI_PLATFORM_BATCH_SIZE, or shorten GEMINI_PLATFORM_TIMEOUT_MS.`,
      );
    }

    const batch = batches[b]!;
    const prompt = buildUmuravaPlatformScoreCandidatesPrompt(job, batch);
    const result = await callGeminiWithRetry(
      prompt,
      ZodPlatformCandidateResultArray,
      env.GEMINI_PLATFORM_RETRIES,
      { timeoutMs: env.GEMINI_PLATFORM_TIMEOUT_MS },
    );
    merged.push(...result.map((item) => normalizePlatformCandidateScores(item)));
  }

  return sortAndRankPlatformCandidates(merged);
};

export const generatePoolInsights = async (job: JobRequirements, allResults: CandidateResult[]): Promise<PoolInsights> => {
  const prompt = buildPoolInsightsPrompt(job, allResults);
  const ai = await callGeminiWithRetry(prompt, ZodPoolInsights, env.GEMINI_INSIGHTS_RETRIES, {
    timeoutMs: env.GEMINI_INSIGHTS_TIMEOUT_MS,
  });
  const avg = allResults.length ? allResults.reduce((acc, cur) => acc + cur.totalScore, 0) / allResults.length : 0;
  return { ...ai, averageScore: Number(avg.toFixed(2)) };
};

export const compareCandidatesWithGemini = async (payload: unknown) => {
  const schema = z.object({
    winner: z.string(),
    comparisonTable: z.array(z.object({ candidateId: z.string(), skillsMatch: z.number(), experienceMatch: z.number(), educationMatch: z.number(), culturalFit: z.number(), totalScore: z.number() })),
    narrative: z.string(),
  });
  const prompt = buildCompareCandidatesPrompt(payload as CandidateResult[]);
  return callGeminiWithRetry(prompt, schema);
};
