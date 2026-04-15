"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareCandidatesWithGemini = exports.generatePoolInsights = exports.scoreAllCandidates = exports.extractJobRequirements = exports.callGeminiWithRetry = void 0;
const generative_ai_1 = require("@google/generative-ai");
const zod_1 = require("zod");
const env_1 = require("../config/env");
const promptBuilder_1 = require("../utils/promptBuilder");
const jsonValidator_1 = require("../utils/jsonValidator");
const scoring_service_1 = require("./scoring.service");
const genAI = new generative_ai_1.GoogleGenerativeAI(env_1.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: env_1.env.GEMINI_MODEL });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const callGeminiWithRetry = async (prompt, schema, retries = 3) => {
    let lastRaw = "";
    for (let i = 0; i < retries; i += 1) {
        try {
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            lastRaw = text;
            const cleaned = text.replace(/```json|```/g, "").trim();
            const parsed = JSON.parse(cleaned);
            return schema.parse(parsed);
        }
        catch (error) {
            if (i === retries - 1)
                throw new Error(`Gemini failed after ${retries} retries. Raw response: ${lastRaw}. Error: ${String(error)}`);
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
const generatePoolInsights = async (job, allResults) => {
    const prompt = (0, promptBuilder_1.buildPoolInsightsPrompt)(job, allResults);
    const ai = await (0, exports.callGeminiWithRetry)(prompt, jsonValidator_1.ZodPoolInsights);
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
