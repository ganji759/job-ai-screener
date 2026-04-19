from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional

Recommendation = Literal["Strong hire", "Consider", "Reject"]
SkillLevel = Literal["Beginner", "Intermediate", "Advanced", "Expert"]
LanguageProficiency = Literal["Basic", "Conversational", "Fluent", "Native"]
AvailabilityStatus = Literal["Available", "Open to Opportunities", "Not Available"]
EngagementType = Literal["Full-time", "Part-time", "Contract"]


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


class Skill(BaseModel):
    name: str
    level: SkillLevel
    yearsOfExperience: int = Field(ge=0)


class Language(BaseModel):
    name: str
    proficiency: LanguageProficiency


class WorkExperience(BaseModel):
    company: str
    role: str
    startDate: str
    endDate: str
    description: str
    technologies: list[str] = []
    isCurrent: bool


class EducationEntry(BaseModel):
    institution: str
    degree: str
    fieldOfStudy: str
    startYear: int
    endYear: int


class Certification(BaseModel):
    name: str
    issuer: str
    issueDate: str


class Project(BaseModel):
    name: str
    description: str
    technologies: list[str] = []
    role: str
    link: Optional[str] = None
    startDate: str
    endDate: str


class Availability(BaseModel):
    status: AvailabilityStatus
    type: EngagementType
    startDate: Optional[str] = None


class SocialLinks(BaseModel):
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None

    model_config = {"extra": "allow"}


class ParsedProfile(BaseModel):
    firstName: str
    lastName: str
    email: str
    headline: str
    bio: Optional[str] = None
    location: str
    skills: list[Skill]
    languages: list[Language] = []
    experience: list[WorkExperience]
    education: list[EducationEntry]
    certifications: list[Certification] = []
    projects: list[Project]
    availability: Availability
    socialLinks: Optional[SocialLinks] = None


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
