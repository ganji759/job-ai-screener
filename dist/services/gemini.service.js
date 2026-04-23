"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareCandidatesWithGemini = exports.generatePoolInsights = exports.scoreUmuravaPlatformCandidates = exports.scoreAllCandidates = exports.extractJobRequirements = exports.callGeminiWithRetry = void 0;
exports.formatGeminiUserError = formatGeminiUserError;
const generative_ai_1 = require("@google/generative-ai");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const promptBuilder_1 = require("../utils/promptBuilder");
const jsonValidator_1 = require("../utils/jsonValidator");
const scoring_service_1 = require("./scoring.service");
const genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env_1.env.GEMINI_MODEL }, { apiVersion: env_1.env.GEMINI_API_VERSION });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/** Maps quota / billing / timeout SDK errors to a concise recruiter-facing message. */
function formatGeminiUserError(err, timeoutMsUsed = env_1.env.GEMINI_TIMEOUT_MS) {
    const raw = String(err);
    if (/AbortError|timed out|timeout|Deadline|ETIMEDOUT|408/i.test(raw)) {
        return `Gemini request timed out after ${timeoutMsUsed / 1000}s. Try again; tune GEMINI_PLATFORM_* or GEMINI_TIMEOUT_MS if needed.`;
    }
    if (/429|RESOURCE_EXHAUSTED|quota|Quota exceeded|exceeded your current quota|billing|rate limit|too many requests/i.test(raw)) {
        return ("Gemini API quota or rate limit was exceeded for this project or model. " +
            "Try again in a few minutes, verify billing and quotas in Google AI Studio, " +
            `or change GEMINI_MODEL (currently ${env_1.env.GEMINI_MODEL}).`);
    }
    return raw.length > 800 ? `${raw.slice(0, 800)}…` : raw;
}
const callGeminiWithRetry = async (prompt, schema, retries = 3, opts) => {
    const timeoutMs = opts?.timeoutMs ?? env_1.env.GEMINI_TIMEOUT_MS;
    let lastRaw = "";
    for (let i = 0; i < retries; i += 1) {
        try {
            const result = await model.generateContent(prompt, { timeout: timeoutMs });
            const text = result.response.text();
            lastRaw = text;
            const cleaned = text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            return schema.parse(parsed);
        }
        catch (error) {
            if (i === retries - 1) {
                const hint = formatGeminiUserError(error, timeoutMs);
                throw new Error(hint.startsWith("Gemini API quota")
                    ? hint
                    : `Gemini failed after ${retries} retries. ${hint}${lastRaw ? ` (last model output length: ${lastRaw.length})` : ""}`);
            }
            await wait(5000 * (2 ** i));
        }
    }
    throw new Error("Unexpected Gemini retry state");
};
exports.callGeminiWithRetry = callGeminiWithRetry;
const extractJobRequirements = async (rawDescription) => {
    const prompt = (0, promptBuilder_1.buildExtractRequirementsPrompt)(rawDescription);
    const data = await (0, exports.callGeminiWithRetry)(prompt, jsonValidator_1.ZodJobRequirements);
    return { ...data, title: data.title ?? "Untitled Role", description: rawDescription };
};
exports.extractJobRequirements = extractJobRequirements;
const scoreAllCandidates = async (job, candidates, batchSize = 20) => {
    const batches = [];
    for (let i = 0; i < candidates.length; i += batchSize)
        batches.push(candidates.slice(i, i + batchSize));
    const settled = await Promise.allSettled(batches.map(async (batch) => {
        const prompt = (0, promptBuilder_1.buildScoreCandidatesPrompt)(job, batch);
        const result = await (0, exports.callGeminiWithRetry)(prompt, jsonValidator_1.ZodCandidateResultArray);
        return result.map((item) => {
            const normalized = {
                ...item,
                rank: 0,
                strengths: item.strengths.slice(0, 3),
                gaps: item.gaps.slice(0, 2),
                recommendation: item.recommendation.trim(),
            };
            return { ...normalized, totalScore: (0, scoring_service_1.computeWeightedScore)(normalized) };
        });
    }));
    const merged = [];
    settled.forEach((entry) => {
        if (entry.status === "fulfilled")
            merged.push(...entry.value);
    });
    return (0, scoring_service_1.sortAndRankCandidates)(merged);
};
exports.scoreAllCandidates = scoreAllCandidates;
/** Scenario 1 — Umurava rubric; sequential batches sized from env + hard wall-clock budget. */
const scoreUmuravaPlatformCandidates = async (job, candidates) => {
    const batchSize = env_1.env.GEMINI_PLATFORM_BATCH_SIZE;
    const batches = [];
    for (let i = 0; i < candidates.length; i += batchSize) {
        batches.push(candidates.slice(i, i + batchSize));
    }
    const merged = [];
    const wallDeadline = Date.now() + env_1.env.GEMINI_PLATFORM_WALL_MS;
    for (let b = 0; b < batches.length; b += 1) {
        if (Date.now() >= wallDeadline) {
            throw new Error(`Umurava platform scoring exceeded wall-time budget (${env_1.env.GEMINI_PLATFORM_WALL_MS / 1000}s). ` +
                `Raise GEMINI_PLATFORM_WALL_MS, increase GEMINI_PLATFORM_BATCH_SIZE, or shorten GEMINI_PLATFORM_TIMEOUT_MS.`);
        }
        const batch = batches[b];
        const prompt = (0, promptBuilder_1.buildUmuravaPlatformScoreCandidatesPrompt)(job, batch);
        const result = await (0, exports.callGeminiWithRetry)(prompt, jsonValidator_1.ZodPlatformCandidateResultArray, env_1.env.GEMINI_PLATFORM_RETRIES, { timeoutMs: env_1.env.GEMINI_PLATFORM_TIMEOUT_MS });
        merged.push(...result.map((item) => (0, scoring_service_1.normalizePlatformCandidateScores)(item)));
    }
    return (0, scoring_service_1.sortAndRankPlatformCandidates)(merged);
};
exports.scoreUmuravaPlatformCandidates = scoreUmuravaPlatformCandidates;
const generatePoolInsights = async (job, allResults) => {
    const prompt = (0, promptBuilder_1.buildPoolInsightsPrompt)(job, allResults);
    const ai = await (0, exports.callGeminiWithRetry)(prompt, jsonValidator_1.ZodPoolInsights, env_1.env.GEMINI_INSIGHTS_RETRIES, {
        timeoutMs: env_1.env.GEMINI_INSIGHTS_TIMEOUT_MS,
    });
    const avg = allResults.length ? allResults.reduce((acc, cur) => acc + cur.totalScore, 0) / allResults.length : 0;
    return { ...ai, averageScore: Number(avg.toFixed(2)) };
};
exports.generatePoolInsights = generatePoolInsights;
const compareCandidatesWithGemini = async (payload) => {
    const schema = zod_1.z.object({
        winner: zod_1.z.string(),
        comparisonTable: zod_1.z.array(zod_1.z.object({ candidateId: zod_1.z.string(), skillsMatch: zod_1.z.number(), experienceMatch: zod_1.z.number(), educationMatch: zod_1.z.number(), culturalFit: zod_1.z.number(), totalScore: zod_1.z.number() })),
        narrative: zod_1.z.string(),
    });
    const prompt = (0, promptBuilder_1.buildCompareCandidatesPrompt)(payload);
    return (0, exports.callGeminiWithRetry)(prompt, schema);
};
exports.compareCandidatesWithGemini = compareCandidatesWithGemini;
