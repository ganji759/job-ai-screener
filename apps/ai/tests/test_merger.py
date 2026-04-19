import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.merger import merge_and_rank


def test_merge_and_rank_normalises_scores():
    evals = [
        {
            "applicant_id": "a",
            "composite_score": 80,
            "dimension_scores": {
                "skills": 80,
                "experience": 80,
                "education": 80,
                "cultural_fit": 80,
            },
            "strengths": ["x"],
            "gaps": [],
            "recommendation": "Consider",
        },
        {
            "applicant_id": "b",
            "composite_score": 60,
            "dimension_scores": {
                "skills": 60,
                "experience": 60,
                "education": 60,
                "cultural_fit": 60,
            },
            "strengths": ["y"],
            "gaps": [],
            "recommendation": "Consider",
        },
        {
            "applicant_id": "c",
            "composite_score": 40,
            "dimension_scores": {
                "skills": 40,
                "experience": 40,
                "education": 40,
                "cultural_fit": 40,
            },
            "strengths": ["z"],
            "gaps": [],
            "recommendation": "Reject",
        },
    ]
    ranked = merge_and_rank(evals)
    assert ranked[0].applicant_id == "a"
    assert ranked[0].composite_score == 100  # min-max stretched
    assert ranked[-1].composite_score == 0
    assert [r.rank for r in ranked] == [1, 2, 3]


def test_merge_and_rank_single_candidate():
    evals = [
        {
            "applicant_id": "solo",
            "composite_score": 75,
            "dimension_scores": {
                "skills": 75,
                "experience": 75,
                "education": 75,
                "cultural_fit": 75,
            },
            "strengths": ["strong"],
            "gaps": [],
            "recommendation": "Strong hire",
        }
    ]
    ranked = merge_and_rank(evals)
    assert len(ranked) == 1
    assert ranked[0].composite_score == 100  # single candidate gets max
    assert ranked[0].rank == 1


def test_merge_and_rank_empty():
    assert merge_and_rank([]) == []
