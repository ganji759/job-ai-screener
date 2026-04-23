# AI / ML Service — apps/ai (Python)

## Stack
- Python 3.11
- FastAPI — async HTTP framework
- `google-generativeai` — official Gemini SDK (Python)
- `pydantic` v2 — all I/O validation, stricter than zod for LLM output
- `pdfplumber` — resume text extraction (handles tables + multi-column)
- `motor` — async MongoDB driver (matches Node.js Mongoose schema)
- `httpx` — async HTTP client (internal calls if needed)
- `numpy` — vectorised score normalisation
- `structlog` — structured logging
- `pytest` + `pytest-asyncio` — testing

## Init
```bash
cd apps/ai
python -m venv .venv
source .venv/bin/activate

pip install fastapi uvicorn[standard] google-generativeai pydantic
pip install pdfplumber motor httpx numpy structlog python-multipart
pip install -D pytest pytest-asyncio ruff mypy

pip freeze > requirements.txt
```

## Directory layout
```
apps/ai/
├── main.py                       # FastAPI app + lifespan
├── core/
│   ├── gemini.py                 # Gemini SDK client (singleton)
│   ├── mongo.py                  # Motor MongoDB client
│   └── logging.py                # structlog configuration
├── schemas.py                    # pydantic models — MIRROR of db/types/index.ts
├── prompts/
│   ├── __init__.py
│   ├── screen_prompt.py          # main candidate evaluation prompt
│   └── normalise_prompt.py       # resume text → ParsedProfile prompt
├── services/
│   ├── __init__.py
│   ├── screening.py              # run_screening — batch orchestration
│   ├── merger.py                 # cross-batch normalisation + ranking
│   ├── normalise.py              # gemini_normalise (raw text → profile)
│   └── pdf_parser.py             # pdfplumber extraction pipeline
├── routers/
│   ├── __init__.py
│   ├── screening.py              # POST /screening/run
│   └── normalise.py              # POST /normalise/pdf, /normalise/text
├── tests/
│   ├── test_merger.py            # deterministic — no Gemini needed
│   ├── test_prompts.py           # snapshot tests on prompt output
│   └── test_screening.py         # integration (mocked Gemini)
├── Dockerfile
├── requirements.txt
└── pyproject.toml                # ruff + mypy config
```

## Entry point
```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from core.gemini import init_gemini
from core.mongo import init_mongo, close_mongo
from core.logging import configure_logging
from routers import screening, normalise

@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    init_gemini()
    await init_mongo()
    yield
    await close_mongo()

app = FastAPI(title="Umurava AI Service", version="1.0.0", lifespan=lifespan)
app.include_router(screening.router, prefix="/screening", tags=["screening"])
app.include_router(normalise.router, prefix="/normalise", tags=["normalise"])

@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

## Gemini client
```python
# core/gemini.py
import os
import google.generativeai as genai

_model: genai.GenerativeModel | None = None

def init_gemini() -> None:
    global _model
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    _model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",   # force JSON mode
            temperature=0.1,                          # deterministic scoring
            max_output_tokens=4096,
        ),
    )

def get_model() -> genai.GenerativeModel:
    if _model is None:
        init_gemini()
    assert _model is not None
    return _model
```

## Pydantic schemas — mirror `packages/db/src/types/index.ts`
```python
# schemas.py
from pydantic import BaseModel, Field, field_validator
from typing import Literal

Recommendation = Literal["Strong hire", "Consider", "Reject"]


class DimensionScores(BaseModel):
    skills:       float = Field(ge=0, le=100)
    experience:   float = Field(ge=0, le=100)
    education:    float = Field(ge=0, le=100)
    cultural_fit: float = Field(ge=0, le=100)


class CandidateEval(BaseModel):
    candidate_index:  int
    dimension_scores: DimensionScores
    composite_score:  float = Field(ge=0, le=100)
    strengths:        list[str] = Field(min_length=1, max_length=5)
    gaps:             list[str] = Field(max_length=5)
    recommendation:   Recommendation


class BatchEvalOutput(BaseModel):
    evaluations: list[CandidateEval]


class ParsedProfile(BaseModel):
    name:             str
    skills:           list[str]
    experience_years: int = Field(ge=0)
    education:        str
    summary:          str = Field(max_length=500)


class ScoringWeights(BaseModel):
    skills:       float = Field(ge=0, le=1)
    experience:   float = Field(ge=0, le=1)
    education:    float = Field(ge=0, le=1)
    cultural_fit: float = Field(ge=0, le=1)

    @field_validator("cultural_fit")
    @classmethod
    def weights_sum_to_one(cls, v: float, info) -> float:
        data = info.data
        s = data.get("skills", 0) + data.get("experience", 0) + data.get("education", 0) + v
        if abs(s - 1.0) > 0.01:
            raise ValueError(f"weights must sum to 1.0, got {s}")
        return v


class JobRequirements(BaseModel):
    skills:           list[str]
    experience_years: int
    education_level:  str
    nice_to_have:     list[str] = []


class Job(BaseModel):
    id: str = Field(alias="_id")
    title: str
    description: str
    requirements: JobRequirements
    scoring_weights: ScoringWeights


class ApplicantIn(BaseModel):
    id: str = Field(alias="_id")
    parsed_profile: ParsedProfile


# API request/response envelopes
class ScreeningRequest(BaseModel):
    run_id:     str
    job:        Job
    applicants: list[ApplicantIn]


class RankedResult(BaseModel):
    applicant_id:     str
    rank:             int
    composite_score:  int
    dimension_scores: DimensionScores
    strengths:        list[str]
    gaps:             list[str]
    recommendation:   Recommendation


class ScreeningResponse(BaseModel):
    run_id:  str
    results: list[RankedResult]
```

## Screening prompt
```python
# prompts/screen_prompt.py
import json
from schemas import Job, ParsedProfile

def build_screening_prompt(job: Job, candidates: list[ParsedProfile]) -> str:
    w = job.scoring_weights
    req = job.requirements

    candidate_blocks = "\n\n".join(
        f"### Candidate {i} (index: {i})\n"
        f"{json.dumps(c.model_dump(), indent=2)}"
        for i, c in enumerate(candidates)
    )

    return f"""You are a senior technical recruiter. Evaluate each candidate strictly and objectively.
Return ONLY a JSON object — no markdown, no explanation, no extra keys.

## Role
Title: {job.title}
Required skills: {", ".join(req.skills)}
Minimum experience: {req.experience_years} years
Education requirement: {req.education_level}
Nice to have: {", ".join(req.nice_to_have) if req.nice_to_have else "none"}

## Scoring weights (must reflect in composite_score)
skills: {w.skills}
experience: {w.experience}
education: {w.education}
cultural_fit: {w.cultural_fit}

composite_score = (skills_score * {w.skills})
                + (experience_score * {w.experience})
                + (education_score * {w.education})
                + (cultural_fit_score * {w.cultural_fit})

## Scoring rubric
skills:       0 = none of the required skills | 50 = half | 100 = all + extras
experience:   0 = no experience | 50 = at threshold | 100 = 2x+ threshold
education:    0 = below requirement | 70 = meets requirement | 100 = exceeds
cultural_fit: infer from summary tone, volunteer work, side projects

## Candidates ({len(candidates)} total)
{candidate_blocks}

## Required JSON output schema
{{
  "evaluations": [
    {{
      "candidate_index": <int matching index above>,
      "dimension_scores": {{
        "skills": <0-100>,
        "experience": <0-100>,
        "education": <0-100>,
        "cultural_fit": <0-100>
      }},
      "composite_score": <0-100 weighted as above>,
      "strengths": [<max 4 concise recruiter-readable strings>],
      "gaps": [<max 3 concise strings, empty array if none>],
      "recommendation": <"Strong hire" | "Consider" | "Reject">
    }}
  ]
}}"""
```

## Resume normalisation prompt
```python
# prompts/normalise_prompt.py

def build_normalise_prompt(raw_text: str) -> str:
    return f"""Extract structured data from this resume text.
Return ONLY JSON, no markdown. Infer missing fields — never leave them null.

Resume:
{raw_text}

Required output:
{{
  "name": <string>,
  "skills": [<array of technical and soft skills>],
  "experience_years": <total years as integer>,
  "education": <highest degree + institution as one string>,
  "summary": <2-sentence professional summary, max 150 words>
}}"""
```

## Batch orchestration — the core engine
```python
# services/screening.py
import asyncio
import json
import structlog
from schemas import (
    ScreeningRequest, RankedResult, BatchEvalOutput, CandidateEval,
    Job, ApplicantIn,
)
from core.gemini import get_model
from prompts.screen_prompt import build_screening_prompt
from services.merger import merge_and_rank

log = structlog.get_logger()
BATCH_SIZE = 25


async def run_screening(req: ScreeningRequest) -> list[RankedResult]:
    """Orchestrate batched Gemini calls, validate, merge, rank."""
    applicants = req.applicants
    batches = [
        applicants[i : i + BATCH_SIZE]
        for i in range(0, len(applicants), BATCH_SIZE)
    ]

    log.info("screening_started",
             run_id=req.run_id,
             total=len(applicants),
             batches=len(batches))

    # run batches concurrently — asyncio.gather is the speedup
    tasks = [evaluate_batch(req.job, batch) for batch in batches]
    batch_results = await asyncio.gather(*tasks, return_exceptions=False)

    # flatten + tag each eval with the real applicant _id
    tagged: list[dict] = []
    for batch, evals in zip(batches, batch_results):
        for ev in evals:
            tagged.append({
                **ev.model_dump(),
                "applicant_id": batch[ev.candidate_index].id,
            })

    ranked = merge_and_rank(tagged)
    log.info("screening_complete", run_id=req.run_id, ranked=len(ranked))
    return ranked


async def evaluate_batch(job: Job, batch: list[ApplicantIn]) -> list[CandidateEval]:
    """Single Gemini call for one batch. One retry on validation failure."""
    profiles = [a.parsed_profile for a in batch]
    prompt = build_screening_prompt(job, profiles)
    model = get_model()
    loop = asyncio.get_event_loop()

    # Gemini SDK is sync — offload to thread pool
    for attempt in range(2):
        try:
            response = await loop.run_in_executor(
                None, model.generate_content, prompt
            )
            parsed = BatchEvalOutput.model_validate_json(response.text)
            return parsed.evaluations
        except Exception as e:
            log.warning("batch_eval_retry",
                        attempt=attempt,
                        error=str(e),
                        batch_size=len(batch))
            if attempt == 1:
                raise

    return []  # unreachable but satisfies type checker
```

## Cross-batch normalisation — critical for fair ranking
```python
# services/merger.py
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
```

## Resume normalisation service
```python
# services/normalise.py
import asyncio
from schemas import ParsedProfile
from core.gemini import get_model
from prompts.normalise_prompt import build_normalise_prompt


async def gemini_normalise(raw_text: str) -> ParsedProfile:
    """Raw resume text → validated ParsedProfile via Gemini."""
    prompt = build_normalise_prompt(raw_text[:8000])  # token budget
    model = get_model()
    loop = asyncio.get_event_loop()

    response = await loop.run_in_executor(None, model.generate_content, prompt)
    return ParsedProfile.model_validate_json(response.text)
```

## PDF extraction
```python
# services/pdf_parser.py
import io
import pdfplumber
from schemas import ParsedProfile
from services.normalise import gemini_normalise


async def parse_pdf(file_bytes: bytes) -> ParsedProfile:
    """Extract text from PDF (handles tables + multi-column), normalise via Gemini."""
    text_chunks: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            text_chunks.append(text)

    raw_text = "\n".join(text_chunks)
    return await gemini_normalise(raw_text)
```

## Routers
```python
# routers/screening.py
from fastapi import APIRouter, HTTPException
import structlog
from schemas import ScreeningRequest, ScreeningResponse
from services.screening import run_screening

router = APIRouter()
log = structlog.get_logger()


@router.post("/run", response_model=ScreeningResponse)
async def screen_candidates(req: ScreeningRequest) -> ScreeningResponse:
    try:
        results = await run_screening(req)
        return ScreeningResponse(run_id=req.run_id, results=results)
    except Exception as e:
        log.error("screening_failed", run_id=req.run_id, error=str(e))
        raise HTTPException(status_code=500, detail={
            "code": "SCREENING_FAILED",
            "message": str(e),
        })
```

```python
# routers/normalise.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas import ParsedProfile
from services.pdf_parser import parse_pdf
from services.normalise import gemini_normalise

router = APIRouter()


@router.post("/pdf", response_model=ParsedProfile)
async def normalise_pdf(file: UploadFile = File(...)) -> ParsedProfile:
    if file.content_type != "application/pdf":
        raise HTTPException(400, "Only PDF files accepted")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "PDF exceeds 10MB limit")
    return await parse_pdf(content)


@router.post("/text", response_model=ParsedProfile)
async def normalise_text(body: dict) -> ParsedProfile:
    raw = body.get("text", "")
    if not raw:
        raise HTTPException(400, "text field required")
    return await gemini_normalise(raw)
```

## Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# system deps for pdfplumber (poppler)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## pyproject.toml
```toml
[tool.ruff]
line-length = 100
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "UP", "B", "A", "C4", "ASYNC"]

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true
```

## Testing
```python
# tests/test_merger.py
from services.merger import merge_and_rank

def test_merge_and_rank_normalises_scores():
    evals = [
        {"applicant_id": "a", "composite_score": 80,
         "dimension_scores": {"skills": 80, "experience": 80, "education": 80, "cultural_fit": 80},
         "strengths": ["x"], "gaps": [], "recommendation": "Consider"},
        {"applicant_id": "b", "composite_score": 60,
         "dimension_scores": {"skills": 60, "experience": 60, "education": 60, "cultural_fit": 60},
         "strengths": ["y"], "gaps": [], "recommendation": "Consider"},
        {"applicant_id": "c", "composite_score": 40,
         "dimension_scores": {"skills": 40, "experience": 40, "education": 40, "cultural_fit": 40},
         "strengths": ["z"], "gaps": [], "recommendation": "Reject"},
    ]
    ranked = merge_and_rank(evals)
    assert ranked[0].applicant_id == "a"
    assert ranked[0].composite_score == 100   # min-max stretched
    assert ranked[-1].composite_score == 0
    assert [r.rank for r in ranked] == [1, 2, 3]
```

## Prompt engineering principles (follow these)
1. **JSON mode always** — `response_mime_type="application/json"`.
   Never parse JSON from markdown code blocks.
2. **Explicit rubric** — include a scoring rubric in the prompt. LLMs drift
   toward high scores without anchoring. Define what 0, 50, and 100 mean.
3. **Low temperature (0.1)** — screening must be reproducible. Higher = noise.
4. **Index candidates from 0** — explicit `(index: N)` labels so
   `candidate_index` is unambiguous in the output array.
5. **Retry on schema validation failure** — one retry before raising.
   Log raw response that failed parsing for debugging.
6. **Batch size ≤ 25** — larger batches degrade evaluation quality
   (model loses focus on early candidates).
7. **Never pass raw PDF text to screening prompt** — always normalise to
   `ParsedProfile` first. Dirty resume text pollutes the scoring context.
8. **Async everywhere** — `asyncio.gather` the batches. Gemini SDK is sync,
   so wrap calls with `loop.run_in_executor(None, ...)`.

## Do not
- Do not set temperature > 0.2 for screening — results become non-reproducible
- Do not call Gemini for CSV rows that already match the Umurava profile schema
- Do not write raw Gemini output to DB — always validate with pydantic first
- Do not batch > 25 candidates per call
- Do not `print()` — use `structlog.get_logger()`
- Do not expose `GEMINI_API_KEY` anywhere other than this Python service
- Do not use sync `requests` library — use `httpx` for async HTTP
- Do not mutate pydantic model instances — they are immutable by design, use
  `.model_copy(update={...})` if you need a modified copy
