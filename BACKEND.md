# Backend — apps/api

## Stack
- Node.js 20 + TypeScript strict
- Express 5 (async error handling built-in)
- BullMQ (job queue) + Upstash Redis
- `pdf-parse` for resume text extraction
- `papaparse` for CSV ingestion
- `multer` for file uploads (memory storage, 10MB limit)
- `pino` for structured logging
- `zod` for all request validation

## Init
```bash
cd apps/api
pnpm init
pnpm add express bullmq ioredis mongoose zod pino pdf-parse papaparse multer
pnpm add @google/generative-ai
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
│   │   ├── ingestion.service.ts   # PDF + CSV parsing → parsed_profile
│   │   └── screening.service.ts   # enqueue + status
│   ├── queue/
│   │   ├── screening.queue.ts     # BullMQ Queue definition
│   │   └── screening.processor.ts # BullMQ Worker — calls AI package
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
GET    /api/jobs                     # list jobs (paginated, limit/offset)
GET    /api/jobs/:jobId              # get job detail
PATCH  /api/jobs/:jobId              # update job (not screening weights after run)
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
GET    /api/screenings/:runId/results        # ranked shortlist (only when complete)
GET    /api/screenings/:runId/results/:applicantId  # single candidate reasoning
```

## Request/response envelope
```typescript
// All responses use this shape
interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: { total?: number; page?: number };
}
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

## Ingestion service — key logic
```typescript
// services/ingestion.service.ts

import pdfParse from "pdf-parse";
import Papa from "papaparse";
import { geminiNormalise } from "../../packages/ai/src"; // calls Gemini to extract profile

export async function parsePDF(buffer: Buffer): Promise<ParsedProfile> {
  const { text } = await pdfParse(buffer);
  const truncated = text.slice(0, 8000); // stay within Gemini token budget
  return geminiNormalise(truncated);     // returns ParsedProfile
}

export async function parseCSV(buffer: Buffer): Promise<ParsedProfile[]> {
  const text = buffer.toString("utf-8");
  const { data, errors } = Papa.parse(text, { header: true, skipEmptyLines: true });
  if (errors.length) throw new AppError("CSV_PARSE_ERROR", errors[0].message);
  return data.map(mapRowToProfile); // deterministic — no AI needed for CSV
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
```

## Screening queue
```typescript
// queue/screening.queue.ts
import { Queue } from "bullmq";
import { redis } from "../lib/redis";

export const screeningQueue = new Queue("screening", { connection: redis });

// queue/screening.processor.ts — runs in worker.ts process
import { Worker } from "bullmq";
import { runScreening } from "../../packages/ai/src";
import { ScreeningRun } from "../../packages/db/src";

new Worker("screening", async (job) => {
  const { jobId, runId, applicantIds, jobCriteria, scoringWeights } = job.data;

  await ScreeningRun.findByIdAndUpdate(runId, { status: "running" });

  const results = await runScreening({ jobCriteria, applicantIds, scoringWeights,
    onBatchComplete: async (batchIdx, total) => {
      await job.updateProgress(Math.round((batchIdx / total) * 100));
    },
  });

  await ScreeningRun.findByIdAndUpdate(runId, {
    status: "complete",
    completed_at: new Date(),
  });
  // results already written to screening_results by runScreening
}, { connection: redis, concurrency: 3 });
```

## Screening status endpoint
```typescript
// routes/screenings.ts
router.get("/:runId/status", async (req, res) => {
  const run = await ScreeningRun.findById(req.params.runId).lean();
  if (!run) return res.status(404).json({ data: null, error: { code: "NOT_FOUND" } });

  const job = await screeningQueue.getJob(run.queue_job_id);
  const progress = typeof job?.progress === "number" ? job.progress : 0;

  res.json({ data: { status: run.status, progress, runId: run._id } });
});
```

## Error class
```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) {
    super(message);
  }
}
```

## Global error handler
```typescript
// middleware/error.ts
import { AppError } from "../lib/errors";

export const errorHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      data: null, error: { code: err.code, message: err.message }
    });
  }
  logger.error(err);
  res.status(500).json({ data: null, error: { code: "INTERNAL", message: "Server error" } });
};
```

## Do not
- No business logic in route handlers — routes call services only
- No `any` type — use `unknown` with narrowing or proper types
- Never await inside a loop when batch processing — use `Promise.all` with chunking
- Never expose Gemini API key to frontend — all AI calls are server-side only
- File uploads go to memory storage, not disk — process and discard buffer
