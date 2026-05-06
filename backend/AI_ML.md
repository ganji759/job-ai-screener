# AI / ML — Gemini Integration

## Overview
Gemini is called from **two places**:
1. **Python AI service** (FastAPI, port 8000) — batch candidate screening (JSON mode) and agent turns
2. **Node.js backend** (in-process SDK fallback) — conversational AI chat (`generatePlainText`, plain-text mode) when `AI_SERVICE_URL` is unset

The Node.js backend prefers routing through the Python service when `AI_SERVICE_URL` is set, but falls back to calling Gemini in-process via `@google/generative-ai` SDK.

## Python AI service stack
- Python 3.11
- FastAPI — async HTTP framework
- `google-generativeai` — official Gemini SDK
- `pydantic` v2 — all I/O validation
- `pdfplumber` — resume text extraction (handles tables + multi-column)
- `motor` — async MongoDB driver
- `numpy` — vectorised score normalisation
- `structlog` — structured logging

## Node.js Gemini service — `backend/src/services/gemini.service.ts`

### `generatePlainText(prompt, timeoutMs?, retries?)`
Plain-text Gemini call used for the "Talk to AI" chat feature. Tries Python service first (if `AI_SERVICE_URL` set), then falls back to in-process SDK. Retries up to 2 times with 3s backoff between attempts. Returns trimmed string.

Model used: `gemini-2.5-flash-lite` (in-process SDK path).

## Python service layout
```
apps/ai/
├── main.py                       # FastAPI app + lifespan
├── core/
│   ├── gemini.py                 # Gemini SDK client (singleton, JSON mode)
│   └── mongo.py                  # Motor MongoDB client
├── schemas.py                    # pydantic models — mirrors db/types/index.ts
├── prompts/
│   ├── screen_prompt.py          # main candidate evaluation prompt
│   └── normalise_prompt.py       # resume text → ParsedProfile prompt
├── services/
│   ├── screening.py              # run_screening — batch orchestration
│   ├── merger.py                 # cross-batch normalisation + ranking
│   ├── normalise.py              # gemini_normalise (raw text → profile)
│   └── pdf_parser.py             # pdfplumber extraction pipeline
└── routers/
    ├── screening.py              # POST /screening/run
    └── normalise.py              # POST /normalise/pdf, /normalise/text
```

## Gemini model configuration (Python — JSON mode)
```python
_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",   # configurable via GEMINI_MODEL env var
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",  # force JSON mode
        temperature=0.1,                         # deterministic scoring
        max_output_tokens=4096,
    ),
)
```

## Agent turn endpoint — `POST /agent/turn`
The Python service exposes a thin `/agent/turn` endpoint used by the Node agent loop:

- Accepts `contents[]` (Gemini Content format conversation history) + tool declarations
- Makes a single `generate_content` call
- Returns `{ type: "tool_calls", calls }` or `{ type: "text", reply }`
- Model cascade (quota-aware): `GEMINI_MODEL` → `gemini-2.5-flash` → `gemini-2.0-flash`
- `gemini-2.5-flash-lite` is always excluded — does not support function calling or `systemInstruction`

## Screening prompt structure
The Python screening prompt is built by `prompts/screen_prompt.py`:
- Role/title/requirements section
- Scoring weights section with explicit composite score formula
- Rubric anchoring what 0, 50, 100 means for each dimension
- Numbered candidate blocks (index: N)
- Required JSON output schema

Batch size ≤ 25. Results are min-max normalised across all batches by `services/merger.py` before final ranking.

## Scoring dimensions
Five dimensions, recruiter-configurable weights per job:
- **Skills** — default 35%
- **Experience** — default 25%
- **Education** — default 15%
- **Role relevance** — default 15%
- **Assets** (certifications, side projects, tools) — default 10%

Skills + experience + education weights are user-configurable; they must sum to 1.0.

## Conversational AI chat prompt structure (Node.js)
Built in `screening.controller.ts → candidateAiChat`:

```
CONTEXT: Candidate for [job title]
=================================
JOB REQUIREMENTS: ...
CANDIDATE PROFILE: ...
SCORING RESULTS: totalScore, recommendation, strengths[], gaps[], dimension scores
HR DECISION: approved/rejected/review + note
CONVERSATION HISTORY: [prior turns]
---
RECRUITER'S QUESTION: [message]
Answer as a knowledgeable, concise AI recruiting assistant...
```

## Cross-batch normalisation (critical for fairness)
Without normalisation, candidates in batch 1 only compete against their 24 peers — Gemini's scoring baseline shifts between batches.

```python
# services/merger.py
scores = np.array([e["composite_score"] for e in evals], dtype=float)
s_min, s_max = scores.min(), scores.max()
if s_max > s_min:
    normalised = ((scores - s_min) / (s_max - s_min) * 100).round().astype(int)
```

## Prompt engineering principles
1. **JSON mode for structured output** — `response_mime_type="application/json"`. Never parse JSON from markdown.
2. **Explicit rubric** — define what 0, 50, and 100 mean per dimension. LLMs drift high without anchoring.
3. **Low temperature (0.1)** — screening must be reproducible.
4. **Index candidates from 0** — explicit `(index: N)` labels prevent mapping errors.
5. **One retry on validation failure** — log raw response that failed parsing.
6. **Batch size ≤ 25** — larger batches degrade evaluation quality.
7. **Normalise to ParsedProfile first** — never pass raw PDF text to the screening prompt.
8. **Plain-text for chat** — conversational replies do not use JSON mode; `generatePlainText` with no schema.

## Do not
- Do not set temperature > 0.2 for screening
- Do not call Gemini for CSV rows that already match the structured profile schema
- Do not write raw Gemini output to DB — always validate first (pydantic in Python, zod in Node)
- Do not batch > 25 candidates per call
- Do not expose `GEMINI_API_KEY` outside the Python service (or backend env)
- Do not use `requests` library in Python — use `httpx` for async HTTP
