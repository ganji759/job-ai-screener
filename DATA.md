# Data Storage — packages/db

## Stack
- MongoDB Atlas (M0 free tier is sufficient for hackathon)
- Mongoose 8 with TypeScript (`mongoose` + type inference via `InferSchemaType`)
- No ODM alternatives — Mongoose's schema validation is the source of truth
- Indexes defined on schema, not applied manually

## Init
```bash
cd packages/db
pnpm init
pnpm add mongoose
pnpm add -D typescript @types/node
```

## Directory layout
```
packages/db/
├── src/
│   ├── index.ts          # export all models + connect()
│   ├── connect.ts        # Mongoose connection with retry
│   ├── models/
│   │   ├── job.model.ts
│   │   ├── applicant.model.ts
│   │   ├── screening-run.model.ts
│   │   └── screening-result.model.ts
│   └── types/
│       └── index.ts      # TypeScript interfaces shared across packages
```

## Connection
```typescript
// connect.ts
import mongoose from "mongoose";

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;
  await mongoose.connect(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
  });
  connected = true;
}
```

Call `connectDB()` once at app startup (`src/index.ts`) and once at
worker startup (`worker.ts`). Never call per-request.

## Schemas

### Job
```typescript
// models/job.model.ts
import { Schema, model, InferSchemaType } from "mongoose";

const scoringWeightsSchema = new Schema({
  skills:       { type: Number, required: true, min: 0, max: 1, default: 0.40 },
  experience:   { type: Number, required: true, min: 0, max: 1, default: 0.35 },
  education:    { type: Number, required: true, min: 0, max: 1, default: 0.15 },
  cultural_fit: { type: Number, required: true, min: 0, max: 1, default: 0.10 },
}, { _id: false });

const requirementsSchema = new Schema({
  skills:           { type: [String], required: true },
  experience_years: { type: Number, required: true, min: 0 },
  education_level:  { type: String, required: true },
  nice_to_have:     { type: [String], default: [] },
}, { _id: false });

const jobSchema = new Schema({
  title:           { type: String, required: true, trim: true },
  description:     { type: String, required: true },
  requirements:    { type: requirementsSchema, required: true },
  scoring_weights: { type: scoringWeightsSchema, required: true },
  deleted_at:      { type: Date, default: null },      // soft delete
}, { timestamps: true });

// Validate weights sum to 1.0 (±0.01 float tolerance)
jobSchema.pre("save", function (next) {
  const w = this.scoring_weights;
  const sum = w.skills + w.experience + w.education + w.cultural_fit;
  if (Math.abs(sum - 1.0) > 0.01) {
    return next(new Error("scoring_weights must sum to 1.0"));
  }
  next();
});

jobSchema.index({ deleted_at: 1, createdAt: -1 }); // list query path

export const Job = model("Job", jobSchema);
export type JobDoc = InferSchemaType<typeof jobSchema>;
```

### Applicant
```typescript
// models/applicant.model.ts
import { Schema, model, InferSchemaType } from "mongoose";

const parsedProfileSchema = new Schema({
  name:             { type: String, required: true },
  skills:           { type: [String], default: [] },
  experience_years: { type: Number, required: true, min: 0 },
  education:        { type: String, default: "" },
  summary:          { type: String, default: "" },
}, { _id: false });

const applicantSchema = new Schema({
  job_id:         { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
  source:         {
    type: String,
    enum: ["umurava_platform", "upload_csv", "resume_pdf"],
    required: true,
  },
  raw_data:       { type: Schema.Types.Mixed },    // original row/text — kept for audit
  parsed_profile: { type: parsedProfileSchema, required: true },
}, { timestamps: true });

// Compound index: fetch all applicants for a job fast
applicantSchema.index({ job_id: 1, createdAt: -1 });

export const Applicant = model("Applicant", applicantSchema);
export type ApplicantDoc = InferSchemaType<typeof applicantSchema>;
```

### ScreeningRun
```typescript
// models/screening-run.model.ts
import { Schema, model, InferSchemaType } from "mongoose";

const screeningRunSchema = new Schema({
  job_id:        { type: Schema.Types.ObjectId, ref: "Job", required: true, index: true },
  status:        {
    type: String,
    enum: ["queued", "running", "complete", "failed"],
    default: "queued",
  },
  queue_job_id:  { type: String },      // BullMQ job id for progress polling
  total_applicants: { type: Number },
  completed_at:  { type: Date },
  error_message: { type: String },
}, { timestamps: true });

screeningRunSchema.index({ job_id: 1, createdAt: -1 });

export const ScreeningRun = model("ScreeningRun", screeningRunSchema);
export type ScreeningRunDoc = InferSchemaType<typeof screeningRunSchema>;
```

### ScreeningResult
```typescript
// models/screening-result.model.ts
import { Schema, model, InferSchemaType } from "mongoose";

const reasoningSchema = new Schema({
  strengths:      { type: [String], required: true },
  gaps:           { type: [String], default: [] },
  recommendation: {
    type: String,
    enum: ["Strong hire", "Consider", "Reject"],
    required: true,
  },
}, { _id: false });

const dimensionScoresSchema = new Schema({
  skills:       { type: Number, required: true },
  experience:   { type: Number, required: true },
  education:    { type: Number, required: true },
  cultural_fit: { type: Number, required: true },
}, { _id: false });

const screeningResultSchema = new Schema({
  screening_run_id: { type: Schema.Types.ObjectId, ref: "ScreeningRun", required: true },
  job_id:           { type: Schema.Types.ObjectId, ref: "Job", required: true },
  applicant_id:     { type: Schema.Types.ObjectId, ref: "Applicant", required: true },
  rank:             { type: Number, required: true },
  composite_score:  { type: Number, required: true, min: 0, max: 100 },
  dimension_scores: { type: dimensionScoresSchema, required: true },
  reasoning:        { type: reasoningSchema, required: true },
  model_version:    { type: String, required: true },
}, { timestamps: true });

// Primary query path: shortlist for a run, sorted by rank
screeningResultSchema.index({ screening_run_id: 1, rank: 1 });
// Secondary: lookup single candidate result
screeningResultSchema.index({ screening_run_id: 1, applicant_id: 1 }, { unique: true });

export const ScreeningResult = model("ScreeningResult", screeningResultSchema);
export type ScreeningResultDoc = InferSchemaType<typeof screeningResultSchema>;
```

## Shared TypeScript types
```typescript
// types/index.ts — used by ai/ and api/ packages

export interface ParsedProfile {
  name: string;
  skills: string[];
  experience_years: number;
  education: string;
  summary: string;
}

export interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
  cultural_fit: number;
}

export interface JobRequirements {
  skills: string[];
  experience_years: number;
  education_level: string;
  nice_to_have: string[];
}

// Lean versions for passing between services (no Mongoose document methods)
export type Job = {
  _id: string;
  title: string;
  description: string;
  requirements: JobRequirements;
  scoring_weights: ScoringWeights;
};

export type Applicant = {
  _id: string;
  job_id: string;
  source: "umurava_platform" | "upload_csv" | "resume_pdf";
  parsed_profile: ParsedProfile;
};
```

## Query patterns — use these, don't invent new ones

```typescript
// Get shortlist for a completed run (top 20)
const shortlist = await ScreeningResult
  .find({ screening_run_id: runId })
  .sort({ rank: 1 })
  .limit(20)
  .populate("applicant_id", "parsed_profile source")
  .lean();

// Paginate applicants for a job
const applicants = await Applicant
  .find({ job_id })
  .sort({ createdAt: -1 })
  .skip(offset)
  .limit(limit)
  .lean();

// List jobs (exclude deleted)
const jobs = await Job
  .find({ deleted_at: null })
  .sort({ createdAt: -1 })
  .lean();

// Bulk insert screening results (never loop + save)
await ScreeningResult.insertMany(results, { ordered: false });
```

## Atlas setup
1. Create free M0 cluster (region: closest to Railway/Render deploy region)
2. Create DB user with `readWrite` role on `umurava` database only
3. Whitelist `0.0.0.0/0` for hackathon (scope to Railway IPs in production)
4. Enable Atlas Search if planning semantic matching (future feature)
5. Connection string format: `mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/umurava`

## Do not
- No raw MongoDB driver — use Mongoose models exclusively
- No `Model.findOne()` without `.lean()` on read-only paths — avoid hydration overhead
- Never store API keys, tokens, or secrets in any document
- Never call `dropCollection()` or `deleteMany({})` without a job_id filter
- Do not use `Model.save()` inside loops — always `insertMany` or `bulkWrite`
- Do not add new fields to schemas without a migration plan — use `{ strict: false }`
  only on `raw_data` field where schema is intentionally open
