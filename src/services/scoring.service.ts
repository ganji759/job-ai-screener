import type { CandidateResult } from "../types";

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
