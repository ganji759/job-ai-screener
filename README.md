# HERON — Hiring Evaluation & Ranking for Optimized Networks

Screen smarter, rank faster, hire with confidence.

HERON is an AI-powered talent screening platform. It ingests candidate profiles (JSON, CSV, PDF resumes), runs Gemini-powered scoring across five weighted dimensions, and delivers a ranked shortlist with per-candidate explainability. Humans make final hiring decisions — AI is advisory only.

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

1. **Conversational AI Agent** — Gemini-powered agent chains up to 12 tool calls (list jobs, search candidates, schedule interviews, approve candidates, and more) via natural language
2. **Intelligent Resume Ingestion** — pdfplumber + Gemini multi-tier parsing for PDF resumes; CSV bulk upload; structured JSON profiles
3. **Weighted AI Candidate Scoring** — 5-dimension rubric: skills 35%, experience 25%, education 15%, role relevance 15%, assets 10%; weights are recruiter-configurable per job
4. **Explainable Shortlists** — per-candidate strengths, gaps, hiring-risk summary, must-have skills met/missing, recommended onboarding time
5. **Automated Interview Scheduling** — agent schedules interviews and sends calendar invites (.ics) via Resend
6. **Pool Insights & Benchmarking** — score distribution, skill gaps, salary range, time-to-fill analytics
7. **HR vs AI Analytics** — confusion matrix (TP/FP/FN/TN), precision, recall, accuracy, agreement rate across all completed screenings
8. **"Talk to AI"** — RAG chat (Gemini) about any shortlisted candidate; rate-limited to 30 req/min

## Deployment

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend API + Worker | Railway (2 services) |
| Python AI service | Railway (Docker) |
| Database | MongoDB Atlas M0 |
| Queue / Cache | Upstash Redis |

See `backend/README.md`, `frontend/README.md`, and `backend/apps/ai/README.md` for per-service setup.
