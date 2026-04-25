import { GoogleGenerativeAI } from "@google/generative-ai";
import { randomUUID } from "node:crypto";
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
import { AiServiceError, aiGenerate, runScreening } from "./aiClient";
import {
  jobRequirementsToPython,
  pythonResultsToCandidateResults,
  umuravaProfileToPython,
} from "./pythonAdapter";

const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL }, { apiVersion: env.GEMINI_API_VERSION });

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const generateViaInProcessSdk = async (prompt: string, timeoutMs: number): Promise<string> => {
  const result = await model.generateContent(prompt, { timeout: timeoutMs });
  return result.response.text();
};

/** Returns the raw Gemini text output, routing through Python if AI_SERVICE_URL is set. */
const generateText = (prompt: string, timeoutMs: number): Promise<string> =>
  env.AI_SERVICE_URL ? aiGenerate(prompt, timeoutMs) : generateViaInProcessSdk(prompt, timeoutMs);

/**
 * Plain-text Gemini call with retry — for conversational responses that should NOT be JSON.
 * Falls back to in-process SDK if Python service is unreachable.
 */
export const generatePlainText = async (prompt: string, timeoutMs = 20_000, retries = 2): Promise<string> => {
  let lastErr: unknown;
  for (let i = 0; i < retries; i += 1) {
    try {
      const text = env.AI_SERVICE_URL
        ? await aiGenerate(prompt, timeoutMs).catch(() => generateViaInProcessSdk(prompt, timeoutMs))
        : await generateViaInProcessSdk(prompt, timeoutMs);
      return text.trim();
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) await wait(3000 * (i + 1));
    }
  }
  throw lastErr;
};

export type GeminiRetryOptions = {
  /** HTTP timeout passed to `@google/generative-ai` generateContent */
  timeoutMs?: number;
};

/** Maps quota / billing / timeout SDK errors to a concise recruiter-facing message. */
export function formatGeminiUserError(err: unknown, timeoutMsUsed = env.GEMINI_TIMEOUT_MS): string {
  const raw = String(err);
  if (/AbortError|timed out|timeout|Deadline|ETIMEDOUT|408|504|TIMEOUT/i.test(raw)) {
    return `Gemini request timed out after ${timeoutMsUsed / 1000}s. Try again; tune GEMINI_PLATFORM_* or GEMINI_TIMEOUT_MS if needed.`;
  }
  if (/429|RESOURCE_EXHAUSTED|QUOTA_EXCEEDED|quota|Quota exceeded|exceeded your current quota|billing|rate limit|too many requests/i.test(raw)) {
    return (
      "Gemini API quota or rate limit was exceeded for this project or model. " +
      "Try again in a few minutes, verify billing and quotas in Google AI Studio, " +
      `or change GEMINI_MODEL (currently ${env.GEMINI_MODEL}).`
    );
  }
  if (/ECONNREFUSED|fetch failed|ENOTFOUND/i.test(raw) && env.AI_SERVICE_URL) {
    return (
      `Python AI service at ${env.AI_SERVICE_URL} is not reachable. ` +
      "Start it with `uvicorn main:app --port 8000` inside backend/apps/ai, " +
      "or unset AI_SERVICE_URL in backend/.env to fall back to the in-process Gemini SDK."
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
      const text = await generateText(prompt, timeoutMs);
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

/**
 * Primary path: forward to Python's `POST /screening/run` (per AI_ML.md).
 * Fallback path: legacy in-process batched Gemini call when AI_SERVICE_URL is unset or Python errors.
 */
export const scoreAllCandidates = async (
  job: JobRequirements,
  candidates: UmuravaProfile[],
  batchSize = 20,
): Promise<CandidateResult[]> => {
  if (env.AI_SERVICE_URL) {
    try {
      return await scoreViaPythonScreening(job, candidates);
    } catch (err) {
      const reason = err instanceof AiServiceError ? `${err.code}: ${err.message}` : String(err);
      // eslint-disable-next-line no-console
      console.warn(`[scoreAllCandidates] Python /screening/run failed — falling back to legacy path. Reason: ${reason}`);
    }
  }
  return scoreAllCandidatesLegacy(job, candidates, batchSize);
};

const scoreViaPythonScreening = async (
  job: JobRequirements,
  candidates: UmuravaProfile[],
): Promise<CandidateResult[]> => {
  const jobId = randomUUID();
  const pythonJob = jobRequirementsToPython(jobId, job);

  const applicantIdByLocalId = new Map<string, string>();
  const skillsByApplicantId = new Map<string, string[]>();
  const pythonApplicants = candidates.map((c) => {
    const applicantId = c.id || randomUUID();
    applicantIdByLocalId.set(applicantId, c.id);
    skillsByApplicantId.set(applicantId, c.skills);
    return { _id: applicantId, parsed_profile: umuravaProfileToPython(c) };
  });

  const response = await runScreening({
    run_id: randomUUID(),
    job: pythonJob,
    applicants: pythonApplicants,
  });

  return pythonResultsToCandidateResults(response.results, job, skillsByApplicantId);
};

const scoreAllCandidatesLegacy = async (
  job: JobRequirements,
  candidates: UmuravaProfile[],
  batchSize: number,
): Promise<CandidateResult[]> => {
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
  const errors: string[] = [];
  settled.forEach((entry) => {
    if (entry.status === "fulfilled") merged.push(...entry.value);
    else errors.push(entry.reason instanceof Error ? entry.reason.message : String(entry.reason));
  });

  if (merged.length === 0) {
    const reason = errors[0] ?? "All Gemini scoring batches failed with no output.";
    throw new Error(reason);
  }

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

/**
 * Local fallback for pool insights — used when Gemini is rate-limited/unavailable so the
 * screening still completes with a useful (if non-narrative) overview. Computes:
 *   • scoreDistribution — count of candidates in 20-point bands.
 *   • topSkillsFound — most frequent skills across the candidate pool.
 *   • skillGapsInPool — must-have skills not present in any scored profile.
 *   • recruitingRecommendation — neutral text noting AI insights were unavailable.
 *   • averageScore — arithmetic mean of `totalScore`.
 */
const computePoolInsightsLocally = (
  job: JobRequirements,
  allResults: CandidateResult[],
): PoolInsights => {
  const buckets = [
    { range: "0-20", min: 0, max: 20 },
    { range: "21-40", min: 21, max: 40 },
    { range: "41-60", min: 41, max: 60 },
    { range: "61-80", min: 61, max: 80 },
    { range: "81-100", min: 81, max: 100 },
  ];
  const scoreDistribution = buckets.map(({ range, min, max }) => ({
    range,
    count: allResults.filter((r) => r.totalScore >= min && r.totalScore <= max).length,
  }));

  const skillsFromBreakdown = allResults.flatMap((r) => r.mustHaveSkillsMet ?? []);
  const counts = new Map<string, number>();
  skillsFromBreakdown.forEach((s) => {
    const key = s.trim().toLowerCase();
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  const topSkillsFound = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([s]) => s);

  const mustHave = (job.mustHaveSkills ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean);
  const present = new Set(topSkillsFound);
  const skillGapsInPool = mustHave.filter((s) => !present.has(s));

  const avg = allResults.length ? allResults.reduce((acc, cur) => acc + cur.totalScore, 0) / allResults.length : 0;
  return {
    scoreDistribution,
    topSkillsFound,
    skillGapsInPool,
    recruitingRecommendation:
      "AI narrative insights were temporarily unavailable (likely Gemini rate limit). Scores and shortlist are computed normally; rerun later for narrative recommendations.",
    averageScore: Number(avg.toFixed(2)),
  };
};

export const generatePoolInsights = async (job: JobRequirements, allResults: CandidateResult[]): Promise<PoolInsights> => {
  const prompt = buildPoolInsightsPrompt(job, allResults);
  try {
    const ai = await callGeminiWithRetry(prompt, ZodPoolInsights, env.GEMINI_INSIGHTS_RETRIES, {
      timeoutMs: env.GEMINI_INSIGHTS_TIMEOUT_MS,
    });
    const avg = allResults.length ? allResults.reduce((acc, cur) => acc + cur.totalScore, 0) / allResults.length : 0;
    return { ...ai, averageScore: Number(avg.toFixed(2)) };
  } catch (err) {
    // Don't fail the whole screening just because the narrative insights call hit
    // a quota / timeout. Fall back to locally-computed insights so the recruiter
    // still gets a complete shortlist + distribution.
    console.warn(
      `[generatePoolInsights] Gemini insights failed — falling back to local stats. Reason: ${err instanceof Error ? err.message : String(err)}`,
    );
    return computePoolInsightsLocally(job, allResults);
  }
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
