import numpy as np
from schemas import RankedResult, DimensionScores


def merge_and_rank(evals: list[dict]) -> list[RankedResult]:
    """
    Min-max normalise composite_score across ALL batches before ranking.
    Without this, candidates in batch-1 only compete against their 24 peers —
    Gemini's scoring baseline shifts between batches and ranking is unfair.
    """
    if not evals:
        return []

    scores = np.array([e["composite_score"] for e in evals], dtype=float)
    s_min, s_max = scores.min(), scores.max()

    if s_max > s_min:
        normalised = ((scores - s_min) / (s_max - s_min) * 100).round().astype(int)
    else:
        normalised = np.full_like(scores, 100, dtype=int)

    for ev, n in zip(evals, normalised):
        ev["composite_score"] = int(n)

    sorted_evals = sorted(evals, key=lambda e: e["composite_score"], reverse=True)

    return [
        RankedResult(
            applicant_id=e["applicant_id"],
            rank=idx + 1,
            composite_score=e["composite_score"],
            dimension_scores=DimensionScores(**e["dimension_scores"]),
            strengths=e["strengths"],
            gaps=e["gaps"],
            recommendation=e["recommendation"],
        )
        for idx, e in enumerate(sorted_evals)
    ]
