# Umurava AI HR — Backend

AI-powered talent screening API. Ingests candidate profiles (JSON/PDF/CSV), runs batch Gemini scoring via a Python AI service, produces a ranked shortlist with per-candidate explainability, and supports conversational AI chat about shortlisted candidates.

## Architecture

```
Frontend (:3000) → Fastify API (:3001) → BullMQ Worker → Python AI service (:8000)
                          │                    │
                          ▼                    ▼
                      MongoDB Atlas         Redis (Upstash)
```

**Apps**
- `apps/api/` — Fastify 5 + TypeScript API server + BullMQ worker entry point
- `apps/ai/` — Python FastAPI service; owns every Gemini call (see `apps/ai/README.md`)

## Quick Start

```bash
cp .env.example .env
# Edit .env — set MONGODB_URI, REDIS_URL, GEMINI_API_KEY, AI_SERVICE_URL

npm install

npm run dev      # Terminal 1: API server (:3001)
npm run worker   # Terminal 2: BullMQ worker (required for screening)
```

Start the Python AI service separately — see `apps/ai/README.md`.

## Core Endpoints (`/api/v1/`)

### Auth
```
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout
```

### Jobs
```
GET    /jobs
POST   /jobs
GET    /jobs/:id
PATCH  /jobs/:id
DELETE /jobs/:id
```

### Applicants
```
GET  /jobs/:jobId/applicants
POST /jobs/:jobId/applicants          # ingest Umurava JSON profiles
POST /jobs/:jobId/applicants/upload   # CSV or PDF bulk upload
```

### Screenings
```
GET    /screenings
POST   /screenings/run-for-job            # one-click — all sources combined
POST   /screenings/platform               # Umurava platform applicants only
POST   /screenings/external               # CSV/PDF upload applicants only
GET    /screenings/:id/status             # poll every 3 s
GET    /screenings/:id/results            # ranked shortlist + scores
PUT    /screenings/:id/recruiter-decisions
POST   /screenings/:id/send-acceptance-emails
POST   /screenings/:id/ai-chat            # RAG chat (30 req/min)
POST   /screenings/:id/compare            # head-to-head candidate compare
POST   /screenings/:id/export
DELETE /screenings/:id
```

### Dashboard
```
GET /dashboard/analytics    # KPIs + HR vs AI confusion matrix
```

## AI Decision Flow

1. Recruiter creates a job with scoring weights (`skills` + `experience` + `education`, sum = 1.0)
2. Candidates ingested — Umurava JSON profiles, CSV rows, or PDF resumes
3. Recruiter triggers screening → API enqueues a BullMQ job, returns `screeningId` immediately
4. Worker calls Python AI service in batches of ≤ 25 candidates
5. Python normalises scores (min-max) across batches and ranks candidates
6. Results written to MongoDB as an immutable `Screening` document
7. Frontend polls `GET /screenings/:id/status` every 3 s until `status: complete`
8. Recruiter reviews the shortlist, marks each candidate `approved` / `rejected` / `review`
9. Recruiter can open "Talk to AI" chat per candidate; email approved candidates via Resend

## Prompt Engineering & Scoring

- Gemini Flash (configurable via `GEMINI_MODEL`) for batch screening — JSON mode, temperature 0.1
- `gemini-2.5-flash-lite` used in-process for AI chat responses (plain-text mode)
- Scoring dimensions: `skills`, `experience`, `education` — recruiter-configurable weights per job
- Cross-batch min-max normalisation ensures fair ranking across large pools
- All LLM output validated with Zod before any DB write

## HR vs AI Analytics

`GET /dashboard/analytics` returns `aiVsHrAccuracy`:
- `tp`, `fp`, `fn`, `tn` counts (confusion matrix — AI shortlist vs HR decisions)
- `precision`, `recall`, `accuracy`, `agreementRate`
- `disagreements[]` — candidates where AI recommendation and HR decision differed

Requires at least one completed screening with saved HR decisions to populate.

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| `POST /screenings/:id/ai-chat` | 30 req / min |
| Screening run variants | 5–10 req / hour |

## Environment Variables

```bash
# Database
MONGODB_URI=           # Direct multi-host string recommended over SRV when behind VPN

# Queue
REDIS_URL=
REDIS_ENABLED=true

# AI
GEMINI_API_KEY=        # Used by Python service AND Node in-process fallback
GEMINI_MODEL=gemini-2.5-flash
AI_SERVICE_URL=http://localhost:8000   # Leave empty to fall back to in-process SDK

# App
JWT_SECRET=
JWT_EXPIRES_IN=24h
PORT=3001

# CORS
FRONTEND_URL=http://localhost:3000

# Email
RESEND_API_KEY=

# File uploads
MAX_FILE_SIZE_MB=10
```

## Key Design Decisions

- **Async screening** — API returns `screeningId` immediately; worker processes in the background
- **Immutable results** — re-screening creates a new document; existing results are never mutated
- **ID mismatch** — `results.shortlist[n].candidateId` stores Umurava `profile.id` (string); `recruiterDecisions` is keyed by Applicant MongoDB `_id` (ObjectId); the analytics endpoint joins the two
- **Python fallback** — set `AI_SERVICE_URL=` (empty) to run Gemini entirely in-process via `@google/generativeai`; no code change needed
- **Connection resilience** — `connectWithRetry` handles transient MongoDB failures at startup (10 retries, exponential backoff)
