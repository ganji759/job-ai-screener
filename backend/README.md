# Umurava AI HR — Backend

AI-powered talent screening API. Ingests candidate profiles (JSON/PDF/CSV), runs batch Gemini scoring, produces a ranked shortlist with per-candidate explainability, and supports conversational AI chat about shortlisted candidates.

## Architecture
```
Frontend (:3000) → Fastify API (:3001) → BullMQ Worker → Python AI service (:8000)
                          |                    |
                          v                    v
                      MongoDB Atlas         Redis (Upstash)
```

## Quick Start
```bash
cp .env.example .env
# Edit .env — set MONGODB_URI, REDIS_URL, GEMINI_API_KEY, AI_SERVICE_URL

npm install
npm run dev      # Terminal 1: API server
npm run worker   # Terminal 2: BullMQ worker (required for screening)
```

## Core Endpoints (`/api/v1/`)

### Auth
```
POST /auth/register
POST /auth/login
GET  /auth/me
```

### Jobs & Applicants
```
GET    /jobs
POST   /jobs
GET    /jobs/:id
PATCH  /jobs/:id
DELETE /jobs/:id
GET    /jobs/:jobId/applicants
POST   /jobs/:jobId/applicants
POST   /jobs/:jobId/applicants/upload
POST   /jobs/:jobId/screenings
```

### Screenings
```
GET    /screenings
POST   /screenings/run-for-job          # one-click, all sources
POST   /screenings/platform             # Umurava platform applicants only
POST   /screenings/external             # CSV/PDF upload applicants only
GET    /screenings/:id/status           # poll (every 3s)
GET    /screenings/:id/results          # ranked shortlist
PUT    /screenings/:id/recruiter-decisions  # save HR decisions
POST   /screenings/:id/send-acceptance-emails
POST   /screenings/:id/ai-chat          # RAG chat about a candidate
POST   /screenings/:id/compare          # head-to-head compare
POST   /screenings/:id/export
DELETE /screenings/:id
```

### Dashboard
```
GET /dashboard/analytics    # KPIs + HR vs AI confusion matrix
```

## AI Decision Flow
1. Recruiter creates a job with scoring weights
2. Candidates ingested (Umurava JSON profiles, CSV, or PDF)
3. Recruiter triggers screening → BullMQ enqueues, returns `screeningId` immediately
4. Worker calls Python AI service in batches of ≤25 candidates
5. Python normalises scores (min-max) across batches and ranks candidates
6. Results written to MongoDB as immutable `Screening` document
7. Frontend polls `GET /screenings/:id/status` every 3s until complete
8. Recruiter reviews shortlist and marks each candidate approved/rejected
9. Recruiter can open "Talk to AI" chat for any shortlisted candidate

## Prompt Engineering & Scoring
- Gemini Flash used for batch screening (via Python service, JSON mode, temperature 0.1)
- `gemini-2.5-flash-lite` used in-process for AI chat (plain-text mode)
- Scoring weights: `skills`, `experience`, `education` (recruiter-configurable, sum to 1.0)
- Cross-batch min-max normalisation ensures fair ranking across large candidate pools
- All LLM output validated by Zod before DB writes

## HR vs AI Analytics
`GET /dashboard/analytics` returns `aiVsHrAccuracy` with:
- `tp`, `fp`, `fn`, `tn` counts (confusion matrix)
- `precision`, `recall`, `accuracy`, `agreementRate`
- `disagreements[]` — candidates where AI and HR differed

## Environment Variables
```
MONGODB_URI=            # Direct multi-host string (not SRV) recommended for VPN
REDIS_URL=
GEMINI_API_KEY=         # Used by Python service AND Node in-process fallback
AI_SERVICE_URL=         # http://localhost:8000 (optional; Node falls back to in-process)
JWT_SECRET=
PORT=3001
```

## Key Design Decisions
- Screening is async — API returns `screeningId` immediately, worker processes in background
- Re-screening creates a new document — existing results are never mutated
- `recruiterDecisions` keyed by Applicant MongoDB `_id`; `results.shortlist[n].candidateId` stores Umurava `profile.id` — requires applicant join for confusion matrix
- `connectWithRetry` handles transient MongoDB connection failures at startup
