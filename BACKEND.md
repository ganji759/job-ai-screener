# Backend — apps/api

## Stack
- Node.js 20 + TypeScript strict
- Express 5 (async error handling built-in)
- BullMQ (job queue) + Upstash Redis
- `axios` — calls the Python AI service over HTTP
- `papaparse` for CSV ingestion (PDFs are sent to the Python service directly)
- `multer` for file uploads (memory storage, 10MB limit)
- `pino` for structured logging
- `zod` for all request validation

## Init
```bash
cd apps/api
pnpm init
pnpm add express bullmq ioredis mongoose zod pino papaparse multer axios form-data
pnpm add -D typescript @types/express @types/node @types/multer ts-node-dev
```

## Directory layout
```
apps/api/
├── src/
│   ├── index.ts              # Express app + server bootstrap
│   ├── worker.ts             # BullMQ worker entry — separate process
│   ├── routes/
│   │   ├── jobs.ts
│   │   ├── applicants.ts
│   │   └── screenings.ts
│   ├── services/
│   │   ├── job.service.ts
│   │   ├── applicant.service.ts
│   │   ├── ingestion.service.ts   # CSV parsing (local) + PDF routing (→ Python)
│   │   ├── screening.service.ts   # enqueue + status
│   │   └── ai.client.ts           # HTTP client for Python AI service
│   ├── queue/
│   │   ├── screening.queue.ts     # BullMQ Queue definition
│   │   └── screening.processor.ts # Worker — calls Python AI service
│   ├── middleware/
│   │   ├── validate.ts            # zod request validator middleware
│   │   ├── error.ts               # global error handler
│   │   └── upload.ts              # multer config
│   └── lib/
│       ├── logger.ts              # pino instance
│       └── errors.ts              # AppError class
├── tsconfig.json
└── package.json
```

## API routes

### Jobs
```
POST   /api/jobs                     # create job
GET    /api/jobs                     # list jobs (paginated)
GET    /api/jobs/:jobId              # get job detail
PATCH  /api/jobs/:jobId              # update job (not weights after run)
DELETE /api/jobs/:jobId              # soft delete
```

### Applicants
```
POST   /api/jobs/:jobId/applicants           # ingest structured profiles (JSON array)
POST   /api/jobs/:jobId/applicants/upload    # ingest CSV or PDF (multipart)
GET    /api/jobs/:jobId/applicants           # list applicants for job
```

### Screenings
```
POST   /api/jobs/:jobId/screenings           # trigger new screening run
GET    /api/screenings/:runId/status         # poll status + progress
GET    /api/screenings/:runId/results        # ranked shortlist (when complete)
GET    /api/screenings/:runId/results/:applicantId  # single candidate reasoning
```

## Request/response envelope
```typescript
interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total?: number; page?: number };
}
```

## AI client — HTTP bridge to Python service
```typescript
// services/ai.client.ts
import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import { logger } from "../lib/logger";

const aiClient: AxiosInstance = axios.create({
  baseURL: process.env.AI_SERVICE_URL,        // http://localhost:8000 or railway internal
  timeout: 120_000,                            // AI batches can take up to 2 min
  headers: { "Content-Type": "application/json" },
});

aiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    logger.error({ err: err.response?.data ?? err.message }, "ai_service_error");
    return Promise.reject(err);
  }
);

export interface ScreeningRequest {
  run_id: string;
  job: object;               // full job document (lean)
  applicants: object[];      // { _id, parsed_profile }[]
}

export interface RankedResult {
  applicant_id: string;
  rank: number;
  composite_score: number;
  dimension_scores: {
    skills: number;
    experience: number;
    education: number;
    cultural_fit: number;
  };
  strengths: string[];
  gaps: string[];
  recommendation: "Strong hire" | "Consider" | "Reject";
}

export async function runAiScreening(
  req: ScreeningRequest
): Promise<{ run_id: string; results: RankedResult[] }> {
  const { data } = await aiClient.post("/screening/run", req);
  return data;
}

export async function normalisePdf(buffer: Buffer, filename: string): Promise<object> {
  const form = new FormData();
  form.append("file", buffer, { filename, contentType: "application/pdf" });
  const { data } = await aiClient.post("/normalise/pdf", form, {
    headers: form.getHeaders(),
  });
  return data;   // ParsedProfile
}

export async function normaliseText(text: string): Promise<object> {
  const { data } = await aiClient.post("/normalise/text", { text });
  return data;   // ParsedProfile
}
```

## Ingestion service — CSV locally, PDF → Python
```typescript
// services/ingestion.service.ts
import Papa from "papaparse";
import { normalisePdf } from "./ai.client";
import { AppError } from "../lib/errors";

export async function parsePDF(buffer: Buffer, filename: string): Promise<ParsedProfile> {
  // Delegate to Python AI service — pdfplumber handles multi-column resumes
  return (await normalisePdf(buffer, filename)) as ParsedProfile;
}

export function parseCSV(buffer: Buffer): ParsedProfile[] {
  // CSV is deterministic — no AI needed
  const text = buffer.toString("utf-8");
  const { data, errors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (errors.length) {
    throw new AppError("CSV_PARSE_ERROR", errors[0].message);
  }
  return data.map(mapRowToProfile);
}

function mapRowToProfile(row: Record<string, string>): ParsedProfile {
  return {
    name: row["Full Name"] ?? row["name"] ?? "Unknown",
    skills: (row["Skills"] ?? "").split(",").map(s => s.trim()).filter(Boolean),
    experience_years: parseInt(row["Years of Experience"] ?? "0", 10),
    education: row["Education"] ?? "",
    summary: row["Summary"] ?? "",
  };
}

interface ParsedProfile {
  name: string;
  skills: string[];
  experience_years: number;
  education: string;
  summary: string;
}
```

## Screening queue
```typescript
// queue/screening.queue.ts
import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const screeningQueue = new Queue("screening", { connection: redis });
```

```typescript
// queue/screening.processor.ts  (runs in worker.ts)
import { Worker } from "bullmq";
import { redis } from "../lib/redis";
import { runAiScreening } from "../services/ai.client";
import { Job, Applicant, ScreeningRun, ScreeningResult } from "../../packages/db";
import { logger } from "../lib/logger";

new Worker("screening", async (queueJob) => {
  const { runId, jobId } = queueJob.data as { runId: string; jobId: string };

  try {
    await ScreeningRun.findByIdAndUpdate(runId, { status: "running" });

    // Gather payload for the Python AI service
    const [job, applicants] = await Promise.all([
      Job.findById(jobId).lean(),
      Applicant.find({ job_id: jobId }).lean(),
    ]);
    if (!job) throw new Error("Job not found");

    await queueJob.updateProgress(10);

    // One HTTP call to Python — Python handles batching internally
    const { results } = await runAiScreening({
      run_id: runId,
      job,
      applicants: applicants.map(a => ({ _id: a._id, parsed_profile: a.parsed_profile })),
    });

    await queueJob.updateProgress(90);

    // Persist ranked results
    await ScreeningResult.insertMany(
      results.map(r => ({
        screening_run_id: runId,
        job_id: jobId,
        applicant_id: r.applicant_id,
        rank: r.rank,
        composite_score: r.composite_score,
        dimension_scores: r.dimension_scores,
        reasoning: {
          strengths: r.strengths,
          gaps: r.gaps,
          recommendation: r.recommendation,
        },
        model_version: "gemini-1.5-flash",
      })),
      { ordered: false }
    );

    await ScreeningRun.findByIdAndUpdate(runId, {
      status: "complete",
      completed_at: new Date(),
    });
    await queueJob.updateProgress(100);

    logger.info({ runId, count: results.length }, "screening_complete");
  } catch (err) {
    logger.error({ err, runId }, "screening_failed");
    await ScreeningRun.findByIdAndUpdate(runId, {
      status: "failed",
      error_message: err instanceof Error ? err.message : String(err),
    });
    throw err;   // let BullMQ mark the job failed
  }
}, { connection: redis, concurrency: 2 });
```

## Validation middleware
```typescript
// middleware/validate.ts
import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";

export const validate = (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        data: null,
        error: { code: "VALIDATION_ERROR", message: result.error.message },
      });
    }
    req.body = result.data;
    next();
  };
```

## Screening status endpoint
```typescript
// routes/screenings.ts
router.get("/:runId/status", async (req, res) => {
  const run = await ScreeningRun.findById(req.params.runId).lean();
  if (!run) {
    return res.status(404).json({ data: null, error: { code: "NOT_FOUND" } });
  }

  const queueJob = await screeningQueue.getJob(run.queue_job_id);
  const progress = typeof queueJob?.progress === "number" ? queueJob.progress : 0;

  res.json({ data: { status: run.status, progress, runId: run._id } });
});
```

## Error class + handler
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) {
    super(message);
  }
}

// middleware/error.ts
import { AppError } from "../lib/errors";

export const errorHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      data: null, error: { code: err.code, message: err.message }
    });
  }
  logger.error(err);
  res.status(500).json({
    data: null,
    error: { code: "INTERNAL", message: "Server error" }
  });
};
```

## Do not
- No business logic in route handlers — routes call services only
- No `any` type — use `unknown` with narrowing or proper types
- Never loop with `await` when batch processing — use `Promise.all` with chunking
- Never call Gemini directly from Node — always go through `ai.client.ts`
- Never expose `AI_SERVICE_URL` to the frontend — it's an internal-only URL
- File uploads go to memory storage, not disk — process buffer and discard
- Never store `GEMINI_API_KEY` in this service's env vars — it lives only on Python
