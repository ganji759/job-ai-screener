// Cross-batch normalisation — critical for fair ranking
// Without this: candidates in batch-1 compete only with their 24 peers,
// not the full pool. Gemini's scoring baseline shifts between batches.

import type { CandidateEval } from "./schemas";

type EvalWithId = CandidateEval & { applicant_id: string };

export function mergeAndRank(evals: EvalWithId[]): EvalWithId[] {
  if (evals.length === 0) return [];

  const scores = evals.map(e => e.composite_score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const normalised = evals.map(e => ({
    ...e,
    composite_score: max === min
      ? 100
      : Math.round(((e.composite_score - min) / (max - min)) * 100),
  }));

  return normalised.sort((a, b) => b.composite_score - a.composite_score);
}