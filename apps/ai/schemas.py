from pydantic import BaseModel, Field, field_validator
from typing import Literal

Recommendation = Literal["Strong hire", "Consider", "Reject"]


class DimensionScores(BaseModel):
    skills: float = Field(ge=0, le=100)
    experience: float = Field(ge=0, le=100)
    education: float = Field(ge=0, le=100)
    cultural_fit: float = Field(ge=0, le=100)


class CandidateEval(BaseModel):
    candidate_index: int
    dimension_scores: DimensionScores
    composite_score: float = Field(ge=0, le=100)
    strengths: list[str] = Field(min_length=1, max_length=5)
    gaps: list[str] = Field(max_length=5)
    recommendation: Recommendation


class BatchEvalOutput(BaseModel):
    evaluations: list[CandidateEval]


class ParsedProfile(BaseModel):
    name: str
    skills: list[str]
    experience_years: int = Field(ge=0)
    education: str
    summary: str = Field(max_length=500)


class ScoringWeights(BaseModel):
    skills: float = Field(ge=0, le=1)
    experience: float = Field(ge=0, le=1)
    education: float = Field(ge=0, le=1)
    cultural_fit: float = Field(ge=0, le=1)

    @field_validator("cultural_fit")
    @classmethod
    def weights_sum_to_one(cls, v: float, info) -> float:
        data = info.data
        s = (
            data.get("skills", 0)
            + data.get("experience", 0)
            + data.get("education", 0)
            + v
        )
        if abs(s - 1.0) > 0.01:
            raise ValueError(f"weights must sum to 1.0, got {s}")
        return v


class JobRequirements(BaseModel):
    skills: list[str]
    experience_years: int
    education_level: str
    nice_to_have: list[str] = []


class Job(BaseModel):
    id: str = Field(alias="_id")
    title: str
    description: str
    requirements: JobRequirements
    scoring_weights: ScoringWeights

    model_config = {"populate_by_name": True}


class ApplicantIn(BaseModel):
    id: str = Field(alias="_id")
    parsed_profile: ParsedProfile

    model_config = {"populate_by_name": True}


# API request/response envelopes
class ScreeningRequest(BaseModel):
    run_id: str
    job: Job
    applicants: list[ApplicantIn]


class RankedResult(BaseModel):
    applicant_id: str
    rank: int
    composite_score: int
    dimension_scores: DimensionScores
    strengths: list[str]
    gaps: list[str]
    recommendation: Recommendation


class ScreeningResponse(BaseModel):
    run_id: str
    results: list[RankedResult]
