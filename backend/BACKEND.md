# Backend — backend/

## Stack
- Node.js 20 + TypeScript strict
- **Fastify** (not Express) — plugins: `@fastify/jwt`, `@fastify/multipart`, `@fastify/rate-limit`, `@fastify/cors`
- BullMQ (job queue) + Upstash Redis
- `axios` — calls the Python AI service over HTTP
- `papaparse` for CSV ingestion (PDFs sent to Python service)
- `pino` for structured logging
- `zod` for all request validation
- `google-generativeai` — also called directly from Node for AI chat (plain-text mode)

## Directory layout
```
backend/src/
├── index.ts              # Fastify app + server bootstrap + connectWithRetry
├── worker.ts             # BullMQ worker entry — separate process
├── routes/
│   ├── auth.routes.ts
│   ├── jobs.routes.ts
│   ├── applicants.routes.ts
│   ├── screenings.routes.ts
│   ├── dashboard.routes.ts
│   └── notifications.routes.ts
├── controllers/
│   ├── auth.controller.ts
│   ├── job.controller.ts
│   ├── applicant.controller.ts
│   ├── screening.controller.ts   # includes candidateAiChat handler
│   └── dashboard.controller.ts   # includes HR vs AI confusion matrix
├── services/
│   ├── job.service.ts
│   ├── applicant.service.ts
│   ├── ingestion.service.ts      # CSV parsing (local) + PDF routing (→ Python)
│   ├── screening.service.ts      # enqueue + status
│   ├── ai.client.ts              # HTTP client for Python AI service
│   └── gemini.service.ts         # In-process Gemini SDK; generatePlainText for AI chat
├── middleware/
│   ├── validate.ts               # zod request validator
│   ├── error.ts                  # global error handler
│   └── auth.ts                   # JWT auth middleware
├── workers/
│   └── screening.processor.ts    # BullMQ worker
└── utils/
    ├── promptBuilder.ts
    └── jsonValidator.ts
```

## API routes (all under `/api/v1/`)

### Auth
```
POST   /auth/register
POST   /auth/login
GET    /auth/me
POST   /auth/logout
```

### Jobs
```
POST   /jobs                     # create job
GET    /jobs                     # list jobs (paginated)
GET    /jobs/:jobId              # get job detail
PATCH  /jobs/:jobId              # update job
DELETE /jobs/:jobId              # soft delete
GET    /jobs/:jobId/applicants   # list applicants for job
POST   /jobs/:jobId/applicants   # ingest structured profiles
POST   /jobs/:jobId/applicants/upload  # ingest CSV or PDF (multipart)
POST   /jobs/:jobId/screenings   # trigger new screening run
```

### Screenings
```
GET    /screenings                          # list all screening runs
POST   /screenings/run                      # start screening (alternate)
POST   /screenings/run-for-job              # one-click screening (all sources)
POST   /screenings/platform                 # sync Umurava-platform applicants
POST   /screenings/external                 # sync CSV/PDF-upload applicants
GET    /screenings/job/:jobId               # screening history for a job
GET    /screenings/:id                      # get screening document
GET    /screenings/:id/status               # poll status + progress
GET    /screenings/:id/results              # ranked shortlist (when complete)
PUT    /screenings/:id/recruiter-decisions  # persist HR accept/reject + notes
POST   /screenings/:id/send-acceptance-emails
GET    /screenings/:id/explanations
GET    /screenings/:id/explanations/export
POST   /screenings/:id/export
DELETE /screenings/:id
POST   /screenings/:id/compare              # head-to-head candidate compare
POST   /screenings/:id/ai-chat              # RAG chat about a shortlisted candidate
```

### Dashboard
```
GET    /dashboard/analytics      # KPIs, charts, HR vs AI confusion matrix
```

## MongoDB connection
`connectWithRetry` in `src/index.ts` retries up to 10 times with exponential backoff.

> **VPN caveat**: MongoDB SRV connection strings (`mongodb+srv://`) may fail behind corporate VPN. Use the direct multi-host form: `mongodb://user:pass@host1:27017,host2:27017,host3:27017/umurava?authSource=admin`.

## Gemini service — `src/services/gemini.service.ts`
Two modes:

1. **JSON mode** (`callGeminiWithRetry` / `aiGenerate`): Routes to Python AI service if `AI_SERVICE_URL` is set, falls back to in-process SDK. Used for batch screening.
2. **Plain-text mode** (`generatePlainText`): For conversational AI chat responses. Tries Python service first, falls back to in-process SDK. Retries up to 2 times.

```typescript
export const generatePlainText = async (prompt: string, timeoutMs = 20_000, retries = 2): Promise<string>
```

## AI chat endpoint — `POST /screenings/:id/ai-chat`
Handler: `candidateAiChat` in `screening.controller.ts`

Body schema:
```typescript
{
  candidateId: string;        // Applicant MongoDB _id
  message: string;            // max 2000 chars
  history?: Array<{ role: "user" | "model"; content: string }>;  // max 40 entries
}
```

Flow:
1. Validates screening exists + is completed + belongs to recruiter
2. Fetches applicant by `_id` to resolve `profile.id`
3. Finds candidate in `allResults` or `shortlist` by matching `profile.id` to `candidateId`
4. Fetches HR decision from `recruiterDecisions[candidateId]`
5. Builds multi-section context prompt (job requirements, scores, strengths, gaps, HR decision, conversation history)
6. Calls `generatePlainText(prompt, 20_000)`, returns `{ reply: string }`

Rate-limited to 30 requests/minute.

## HR vs AI confusion matrix — `dashboard.controller.ts`
Classifies each candidate in completed screenings that have `recruiterDecisions`:
- **TP**: AI recommended (yes/maybe) AND HR approved
- **FP**: AI recommended AND HR rejected
- **FN**: AI did NOT recommend AND HR approved
- **TN**: AI did NOT recommend AND HR rejected

**ID resolution**: `results.shortlist[n].candidateId` stores `profile.id` (Umurava platform string), while `recruiterDecisions` is keyed by Applicant MongoDB `_id`. The controller fetches all relevant applicants and builds a `Map<profileId, { mongoId, name }>` join to resolve this.

## Request validation
Fastify schema-based validation + Zod for body parsing. `z.parse()` throws typed errors caught by the global error handler.

## Rate limits (via `@fastify/rate-limit`)
- `POST /screenings/run` — 5/hour
- `POST /screenings/run-for-job` — 10/hour
- `POST /screenings/platform` — 10/hour
- `POST /screenings/external` — 10/hour
- `POST /screenings/:id/ai-chat` — 30/minute

## Do not
- No business logic in route handlers — routes call controllers → services
- No `any` type — use `unknown` with narrowing
- Never loop with `await` when batch processing — use `Promise.all` with chunking
- Never expose `AI_SERVICE_URL` to the frontend
- File uploads go to memory storage, not disk
- Never store `GEMINI_API_KEY` in frontend env vars
