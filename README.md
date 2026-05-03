# Umurava AI HR

AI-powered talent screening platform. Ingests candidate profiles (Umurava JSON, CSV, PDF), runs batch Gemini scoring, and delivers a ranked shortlist with per-candidate explainability. Humans make final hiring decisions — AI is advisory only.

## Architecture

```
Next.js frontend (:3000)
        │  REST / JSON
        ▼
Fastify API (:3001)  ←  auth, CRUD, file upload, queue orchestration
        │  HTTP
        ▼
Python AI service (:8000)  ←  Gemini calls, PDF parsing, normalisation
        │
        ▼
  Google Gemini
```

**Infrastructure**
- MongoDB Atlas — persistent storage
- Redis (Upstash) — BullMQ queue for async screening jobs

## Repo Structure

```
umuravaHR/
├── backend/                  # Node.js 20 + TypeScript monorepo (pnpm + Turborepo)
│   ├── apps/
│   │   ├── api/              # Fastify API + BullMQ worker
│   │   └── ai/               # Python FastAPI AI service (Gemini wrapper)
│   └── packages/
│       └── db/               # Shared Mongoose schemas + TypeScript types
└── frontend/                 # Next.js 14 App Router recruiter dashboard
```

## Quick Start

```bash
# 1. Backend API (Terminal 1)
cd backend
cp .env.example .env          # fill in MONGODB_URI, REDIS_URL, GEMINI_API_KEY
npm install
npm run dev

# 2. BullMQ Worker (Terminal 2 — required for screening)
cd backend
npm run worker

# 3. Python AI Service (Terminal 3)
cd backend/apps/ai
.\start.ps1                   # Windows (creates .venv, loads .env, starts uvicorn)
# or on macOS/Linux: see backend/apps/ai/README.md

# 4. Frontend (Terminal 4)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

## Key Features

- **Job management** — create jobs with skill requirements and scoring weights
- **Candidate ingestion** — Umurava platform profiles, CSV bulk upload, PDF resumes
- **Async AI screening** — BullMQ queues screening; frontend polls for completion
- **Ranked shortlist** — min-max normalised scores across skills / experience / education
- **HR decisions** — approve, reject, or mark for review per candidate
- **"Talk to AI"** — RAG chat (Gemini) about any shortlisted candidate (30 req/min)
- **Analytics** — HR vs AI confusion matrix (precision / recall / accuracy / agreement)
- **Acceptance emails** — Resend integration to notify approved candidates
- **Interview scheduling** — propose up to 3 time slots per accepted candidate; invite email + `.ics` calendar file sent automatically via Resend

## Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend API + Worker | Railway (2 services) |
| Python AI service | Railway (Docker) |
| Database | MongoDB Atlas M0 |
| Queue / Cache | Upstash Redis |

See `backend/README.md`, `frontend/README.md`, and `backend/apps/ai/README.md` for per-service setup.
