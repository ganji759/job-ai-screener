import type { CandidateResult, PlatformCandidateResult, PlatformScoringBreakdown } from "../types";

export const AI_SCORING_WEIGHTS = {
  skillsMatch: 0.4,
  experienceMatch: 0.25,
  educationMatch: 0.2,
  culturalFit: 0.15,
} as const;

export const computeWeightedScore = (candidate: CandidateResult): number => {
  const { skillsMatch, experienceMatch, educationMatch, culturalFit } = candidate.breakdown;
  return Number(
    (
      skillsMatch * AI_SCORING_WEIGHTS.skillsMatch +
      experienceMatch * AI_SCORING_WEIGHTS.experienceMatch +
      educationMatch * AI_SCORING_WEIGHTS.educationMatch +
      culturalFit * AI_SCORING_WEIGHTS.culturalFit
    ).toFixed(2),
  );
};

export const sortAndRankCandidates = (results: CandidateResult[]): CandidateResult[] => {
  return results
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, index) => ({ ...item, rank: index + 1 }));
};

export const sumPlatformBreakdown = (b: PlatformScoringBreakdown): number => {
  const raw =
    b.skillsMatch + b.experience + b.education + b.roleRelevance + b.additionalAssets;
  return Math.min(100, Number(raw.toFixed(2)));
};

/** Reconcile Gemini totalScore with breakdown caps. */
export const normalizePlatformCandidateScores = (item: PlatformCandidateResult): PlatformCandidateResult => {
  const sum = sumPlatformBreakdown(item.scoreBreakdown);
  return {
    ...item,
    totalScore: sum,
  };
};

export const sortAndRankPlatformCandidates = (results: PlatformCandidateResult[]): PlatformCandidateResult[] => {
  return results
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, index) => ({ ...item, rank: index + 1 }));
};
