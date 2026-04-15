import { GoogleGenerativeAI } from "@google/generative-ai";
import { z, type ZodSchema } from "zod";
import { env } from "../config/env";
import type { CandidateResult, JobRequirements, PoolInsights, UmuravaProfile } from "../types";
import { buildCompareCandidatesPrompt, buildExtractRequirementsPrompt, buildPoolInsightsPrompt, buildScoreCandidatesPrompt } from "../utils/promptBuilder";
import { ZodCandidateResultArray, ZodJobRequirements, ZodPoolInsights } from "../utils/jsonValidator";
import { computeWeightedScore, sortAndRankCandidates } from "./scoring.service";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const callGeminiWithRetry = async <T>(prompt: string, schema: ZodSchema<T>, retries = 3): Promise<T> => {
  let lastRaw = "";
  for (let i = 0; i < retries; i += 1) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      lastRaw = text;
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as unknown;
      return schema.parse(parsed);
    } catch (error) {
      if (i === retries - 1) throw new Error(`Gemini failed after ${retries} retries. Raw response: ${lastRaw}. Error: ${String(error)}`);
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

export const generatePoolInsights = async (job: JobRequirements, allResults: CandidateResult[]): Promise<PoolInsights> => {
  const prompt = buildPoolInsightsPrompt(job, allResults);
  const ai = await callGeminiWithRetry(prompt, ZodPoolInsights);
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
