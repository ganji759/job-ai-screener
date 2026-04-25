"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortAndRankPlatformCandidates = exports.normalizePlatformCandidateScores = exports.sumPlatformBreakdown = exports.sortAndRankCandidates = exports.computeWeightedScore = exports.AI_SCORING_WEIGHTS = void 0;
exports.AI_SCORING_WEIGHTS = {
    skillsMatch: 0.4,
    experienceMatch: 0.25,
    educationMatch: 0.2,
    culturalFit: 0.15,
};
const computeWeightedScore = (candidate) => {
    const { skillsMatch, experienceMatch, educationMatch, culturalFit } = candidate.breakdown;
    return Number((skillsMatch * exports.AI_SCORING_WEIGHTS.skillsMatch +
        experienceMatch * exports.AI_SCORING_WEIGHTS.experienceMatch +
        educationMatch * exports.AI_SCORING_WEIGHTS.educationMatch +
        culturalFit * exports.AI_SCORING_WEIGHTS.culturalFit).toFixed(2));
};
exports.computeWeightedScore = computeWeightedScore;
const sortAndRankCandidates = (results) => {
    return results
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((item, index) => ({ ...item, rank: index + 1 }));
};
exports.sortAndRankCandidates = sortAndRankCandidates;
const sumPlatformBreakdown = (b) => {
    const raw = b.skillsMatch + b.experience + b.education + b.roleRelevance + b.additionalAssets;
    return Math.min(100, Number(raw.toFixed(2)));
};
exports.sumPlatformBreakdown = sumPlatformBreakdown;
/** Reconcile Gemini totalScore with breakdown caps. */
const normalizePlatformCandidateScores = (item) => {
    const sum = (0, exports.sumPlatformBreakdown)(item.scoreBreakdown);
    return {
        ...item,
        totalScore: sum,
    };
};
exports.normalizePlatformCandidateScores = normalizePlatformCandidateScores;
const sortAndRankPlatformCandidates = (results) => {
    return results
        .sort((a, b) => b.totalScore - a.totalScore)
        .map((item, index) => ({ ...item, rank: index + 1 }));
};
exports.sortAndRankPlatformCandidates = sortAndRankPlatformCandidates;
