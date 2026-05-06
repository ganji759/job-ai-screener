# HERON — Project Root (Backend)

## What this is
HERON (Hiring Evaluation & Ranking for Optimized Networks) is an AI-powered recruiter tool. It ingests job descriptions + candidate pools (structured JSON profiles OR uploaded CSV/PDF resumes), runs batch Gemini screening, and returns a ranked shortlist with per-candidate explainability. Humans make final hiring decisions — AI is advisory only.

## Repo layout
```
/
├── apps/
│   ├── api/          # Node.js + TypeScript Fastify backend → see BACKEND.md
│   └── ai/           # Python + FastAPI AI service          → see AI_ML.md
├── packages/
│   └── db/           # Mongo schemas/client (TS)            → see DATA.md
├── CLAUDE.md         ← you are here
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
GEMINI_MODEL=gemini-2.5-flash
AI_SERVICE_URL=http://localhost:8000   # Node.js → Python bridge

# Queue
REDIS_URL=
REDIS_ENABLED=true

# App
JWT_SECRET=
JWT_EXPIRES_IN=24h
PORT=3001

# CORS
FRONTEND_URL=http://localhost:3000

# Email
RESEND_API_KEY=
RESEND_FROM=
```
Never commit `.env`. Use `.env.example` with keys only.

## Service communication
```
Frontend (Next.js, :3000)
      │  REST/JSON
      ▼
Backend API (Node.js, :3001)  ← CRUD, auth, file upload, queue orchestration, agent tool execution
      │  HTTP (internal)
      ▼
AI Service (Python, :8000)    ← Gemini calls, PDF parsing, agent turn
      │
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
1. Screening is async — Node API returns `screeningId` immediately.
   Node's BullMQ worker calls the Python AI service, which processes the batch.
   Frontend polls `GET /screenings/:id/status` every 3s.
2. Gemini is called in batches of 25 candidates max (Python side).
   Results are normalised across batches with min-max before final ranking.
3. Screening results are immutable once written. Re-screening creates a new
   `screeningId`.
4. Scoring weights are per-job and recruiter-configurable before triggering
   a screening run (skills + experience + education, sum = 1.0).
5. Python AI service is stateless — it can be scaled horizontally behind a
   load balancer if volume grows. All state lives in MongoDB.
6. Agent loop (POST /agent/chat) runs up to 5 Gemini turns per request.
   Tool execution (MongoDB queries, interview scheduling) runs in Node.
   Python only handles the Gemini generate_content call.

## Commands
```bash
# Root (JS/TS apps)
npm run dev      # start API server (:3001)
npm run worker   # start BullMQ worker (separate process)
npm run build    # production build
npm run lint     # eslint + tsc --noEmit

# Python AI service (apps/ai/)
cd apps/ai
.\start.ps1                              # Windows — creates .venv, starts uvicorn
# macOS/Linux:
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
pytest                                   # tests
ruff check . && mypy .                   # lint + type check
```

## Deployment targets
- Frontend → Vercel
- Backend API + Queue worker → Railway (two services from `apps/api`)
- AI Service → Railway (Docker build from `apps/ai/`)
- DB → MongoDB Atlas M0 free tier
- Redis → Upstash free tier

Railway private networking wires Node.js → Python internally. The AI service
URL in prod is `http://ai-service.railway.internal:8000` — never public.
