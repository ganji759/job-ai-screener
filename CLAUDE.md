# Umurava AI Talent Screener — Project Root

## What you are building
An AI-powered recruiter tool that ingests job descriptions + candidate pools
(structured Umurava profiles OR uploaded CSV/PDF resumes), runs batch Gemini
screening, and returns a ranked shortlist (Top 10/20) with per-candidate
explainability. Humans make final hiring decisions — AI is advisory only.

## Repo layout
```
/
├── apps/
│   ├── web/          # Next.js 14 frontend          → see FRONTEND.md
│   ├── api/          # Node.js + TypeScript backend → see BACKEND.md
│   └── ai/           # Python + FastAPI AI service  → see AI_ML.md
├── packages/
│   └── db/           # Mongo schemas/client (TS)    → see DATA.md
├── CLAUDE.md         ← you are here
├── FRONTEND.md
├── BACKEND.md
├── AI_ML.md
└── DATA.md
```

## Tech stack (locked)
| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Redux Toolkit + Tailwind | Required |
| Backend | Node.js 20 + TypeScript strict | Required |
| AI service | Python 3.11 + FastAPI + `google-generativeai` | Full AI ecosystem |
| DB | MongoDB Atlas + Mongoose (Node) / Motor (Python) | Required |
| Queue | BullMQ + Redis (Upstash for prod) | Async AI jobs |
| File parse | `pdfplumber` (Python, for PDFs) + `papaparse` (Node, CSVs) | Production-grade |

## Why a separate Python AI service
- Gemini SDK is more mature in Python
- `pdfplumber` handles multi-column resumes and tables far better than `pdf-parse`
- `pydantic` gives stricter output validation than `zod` for LLM responses
- Future extensions (embeddings, semantic matching, fine-tuning) are Python-native
- The AI service is stateless — Node.js calls it over HTTP, scales independently

## Monorepo setup
```bash
pnpm init
pnpm add -D turbo typescript @types/node
# each JS/TS app has its own package.json
# apps/ai/ has its own requirements.txt + Dockerfile
```
`turbo.json` pipelines: `build` → `lint` → `test` (JS/TS apps only).
Python app builds via Docker; tested with `pytest` locally.

## Environment variables (root `.env`)
```
# Database
MONGODB_URI=

# AI service
GEMINI_API_KEY=
AI_SERVICE_URL=http://localhost:8000   # Node.js → Python bridge

# Queue
REDIS_URL=

# App
NEXTAUTH_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:4000
```
Never commit `.env`. Use `.env.example` with keys only. `GEMINI_API_KEY`
is only set on the **Python AI service** — Node.js never touches it.

## Service communication
```
Frontend (Next.js, :3000)
      │  REST/JSON
      ▼
Backend API (Node.js, :4000)  ← CRUD, auth, file upload, queue orchestration
      │  HTTP (internal)
      ▼
AI Service (Python, :8000)    ← Gemini calls, PDF parsing, ranking
      │                          (stateless; reads/writes MongoDB)
      ▼
MongoDB Atlas
```
The backend API is the only service exposed publicly. The Python AI service
is called over an internal network (Railway private networking in prod,
localhost in dev).

## Shared conventions
- **TypeScript** (Node, Next): strict mode everywhere. No `any`. Use `unknown` + narrowing.
- **Python** (AI service): type hints on every function, `pydantic` for all I/O schemas,
  `ruff` + `mypy` in CI. No untyped dicts crossing service boundaries.
- All inter-service data flows as typed DTOs:
  - TS types in `packages/db/src/types/` (Node and Frontend)
  - Pydantic models in `apps/ai/schemas.py` (Python)
  - These two MUST mirror each other field-for-field
- Errors:
  - Node: typed `AppError` class with `code + message`
  - Python: `HTTPException` with structured `detail`
- All LLM output validated before writing to DB (pydantic in Python, zod in Node).
- No `print` or `console.log` in production paths — use `pino` (Node) or `structlog` (Python).
- API responses always `{ data, error, meta }` envelope (Node and Python both).

## Key architectural decisions
1. Screening is async — Node API returns `screening_run_id` immediately.
   Node's BullMQ worker calls the Python AI service, which processes the batch.
   Frontend polls `GET /screenings/:id/status` every 3s.
2. Gemini is called in batches of 25 candidates max (Python side).
   Results are normalised across batches with min-max before final ranking.
3. Screening results are immutable once written. Re-screening creates a new
   `screening_run_id`.
4. Scoring weights are per-job and recruiter-configurable before triggering
   a screening run.
5. Python AI service is stateless — it can be scaled horizontally behind a
   load balancer if volume grows. All state lives in MongoDB.

## Commands
```bash
# Root (JS/TS apps)
pnpm dev          # start web + api via turbo
pnpm build        # production build
pnpm lint         # eslint + tsc --noEmit
pnpm test         # vitest

# Python AI service (apps/ai/)
cd apps/ai
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # dev server
pytest                                    # tests
ruff check . && mypy .                    # lint + type check

# Full stack dev (run in separate terminals)
pnpm dev                                  # terminal 1: web + api
cd apps/ai && uvicorn main:app --reload   # terminal 2: AI service
```

## Deployment targets
- Frontend → Vercel (`apps/web`)
- Backend API + Queue worker → Railway (two services from `apps/api`)
- **AI Service → Railway (Docker build from `apps/ai/`)**
- DB → MongoDB Atlas M0 free tier
- Redis → Upstash free tier

Railway private networking wires Node.js → Python internally. The AI service
URL in prod is `http://ai-service.railway.internal:8000` — never public.
