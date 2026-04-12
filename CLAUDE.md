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
│   ├── web/          # Next.js 14 frontend  → see FRONTEND.md
│   └── api/          # Node.js + TypeScript  → see BACKEND.md
├── packages/
│   ├── ai/           # Gemini orchestration  → see AI_ML.md
│   └── db/           # Mongo schemas/client  → see DATA.md
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
| AI | Gemini 1.5 Flash (via `@google/generative-ai`) | Mandatory |
| DB | MongoDB Atlas + Mongoose | Required |
| Queue | BullMQ + Redis (Upstash for prod) | Async AI jobs |
| File parse | `pdf-parse` + `papaparse` | Resume/CSV ingestion |

## Monorepo setup
```bash
pnpm init
pnpm add -D turbo typescript @types/node
# each app has its own package.json
```
`turbo.json` pipelines: `build` → `lint` → `test`

## Environment variables (root `.env`)
```
MONGODB_URI=
GEMINI_API_KEY=
REDIS_URL=
NEXTAUTH_SECRET=
NEXT_PUBLIC_API_URL=
```
Never commit `.env`. Use `.env.example` with keys only.

## Shared conventions
- TypeScript strict mode everywhere. No `any`. Use `unknown` + narrowing.
- All inter-service data flows as typed DTOs defined in `packages/db/src/types/`.
- Errors: never throw raw strings. Use typed `AppError` class with `code + message`.
- All AI output validated with `zod` before writing to DB.
- No `console.log` in production paths — use `pino` logger.
- API responses always `{ data, error, meta }` envelope.

## Key architectural decisions
1. Screening is async — API returns `screening_run_id` immediately, frontend polls
   `GET /screenings/:id/status`. No 30-second spinners.
2. Gemini is called in batches of 25 candidates max. Results are normalised
   across batches with min-max before final ranking.
3. Screening results are immutable once written. Re-screening creates a new
   `screening_run_id`.
4. Scoring weights are per-job and recruiter-configurable before triggering
   a screening run.

## Commands
```bash
pnpm dev          # start all apps in parallel via turbo
pnpm build        # production build
pnpm lint         # eslint + tsc --noEmit across all packages
pnpm test         # vitest across all packages
```

## Deployment targets
- Frontend → Vercel (`apps/web`)
- API + Queue worker → Railway (two services from `apps/api`)
- DB → MongoDB Atlas M0 free tier
- Redis → Upstash free tier
