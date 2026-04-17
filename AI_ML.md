# AI / ML Layer — packages/ai

## Stack
- `@google/generative-ai` — official Gemini SDK
- **Gemini 1.5 Flash** — high-performance model with 1M token context and low latency
- `zod` — validate all Gemini JSON output before touching DB
- No other ML frameworks needed for this scope

## Init
```bash
cd packages/ai
pnpm init
pnpm add @google/generative-ai zod
pnpm add -D typescript @types/node
```

## Directory layout
```
packages/ai/
├── src/
│   ├── index.ts              # public exports
│   ├── client.ts             # Gemini SDK initialisation
│   ├── prompts/
│   │   ├── screen.prompt.ts  # main candidate evaluation prompt builder
│   │   └── normalise.prompt.ts  # resume text → ParsedProfile prompt
│   ├── screening.ts          # runScreening() — batch orchestration
│   ├── normalise.ts          # geminiNormalise() — resume/raw text → profile
│   ├── merger.ts             # mergeAndRank() — cross-batch normalisation
│   └── schemas.ts            # zod schemas for all Gemini outputs
```

## Client
```typescript
// client.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Gemini 1.5 Flash - high-performance model for scale
export const flashModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json", // force JSON mode
    temperature: 0.1,                     // low temp for consistent scoring
    maxOutputTokens: 8192,                // increased for larger batches
  },
});

// For complex evaluations requiring deeper reasoning
export const proModel = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.2,                     // slightly higher for nuanced evaluation
    maxOutputTokens: 8192,
  },
});
```

## Output schemas (zod)
```typescript
// schemas.ts
import { z } from "zod";

export const DimensionScores = z.object({
  skills:       z.number().min(0).max(100),
  experience:   z.number().min(0).max(100),
  education:    z.number().min(0).max(100),
  cultural_fit: z.number().min(0).max(100),
});

export const CandidateEval = z.object({
  candidate_index: z.number().int().min(0),
  dimension_scores: DimensionScores,
  composite_score: z.number().min(0).max(100),
  strengths: z.array(z.string()).min(1).max(5),
  gaps:      z.array(z.string()).max(5),
  recommendation: z.enum(["Strong hire", "Consider", "Reject"]),
});

export const BatchEvalOutput = z.object({
  evaluations: z.array(CandidateEval),
});

export const ParsedProfileSchema = z.object({
  name:             z.string(),
  skills:           z.array(z.string()),
  experience_years: z.number().int().min(0),
  education:        z.string(),
  summary:          z.string().max(500),
});

export type CandidateEval    = z.infer<typeof CandidateEval>;
export type BatchEvalOutput  = z.infer<typeof BatchEvalOutput>;
export type ParsedProfile    = z.infer<typeof ParsedProfileSchema>;
```

## Screening prompt
```typescript
// prompts/screen.prompt.ts
import type { Job, ParsedProfile } from "../../db/src/types";

export function buildScreeningPrompt(
  job: Job,
  candidates: ParsedProfile[],
): string {
  return `You are a senior technical recruiter. Evaluate each candidate strictly and objectively.
Return ONLY a JSON object — no markdown, no explanation, no extra keys.

## Role
Title: ${job.title}
Required skills: ${job.requirements.skills.join(", ")}
Minimum experience: ${job.requirements.experience_years} years
Education requirement: ${job.requirements.education_level}
Nice to have: ${(job.requirements.nice_to_have ?? []).join(", ") || "none"}

## Scoring weights (must reflect in composite_score)
skills: ${job.scoring_weights.skills}
experience: ${job.scoring_weights.experience}
education: ${job.scoring_weights.education}
cultural_fit: ${job.scoring_weights.cultural_fit}

composite_score = (skills_score * ${job.scoring_weights.skills}) +
                  (experience_score * ${job.scoring_weights.experience}) +
                  (education_score * ${job.scoring_weights.education}) +
                  (cultural_fit_score * ${job.scoring_weights.cultural_fit})

## Scoring rubric
skills:       0=none of the required skills | 50=half | 100=all + extras
experience:   0=no experience | 50=at threshold | 100=2x+ threshold
education:    0=below requirement | 70=meets requirement | 100=exceeds
cultural_fit: infer from summary tone, volunteer work, side projects

## Candidates (${candidates.length} total)
${candidates.map((c, i) => `### Candidate ${i} (index: ${i})
${JSON.stringify(c, null, 2)}`).join("\n\n")}

## Required JSON output schema
{
  "evaluations": [
    {
      "candidate_index": <int matching index above>,
      "dimension_scores": {
        "skills": <0-100>,
        "experience": <0-100>,
        "education": <0-100>,
        "cultural_fit": <0-100>
      },
      "composite_score": <0-100 weighted as above>,
      "strengths": [<max 4 concise recruiter-readable strings>],
      "gaps": [<max 3 concise strings, empty array if none>],
      "recommendation": <"Strong hire" | "Consider" | "Reject">
    }
  ]
}`;
}
```

## Resume normalisation prompt
```typescript
// prompts/normalise.prompt.ts
export function buildNormalisePrompt(rawText: string): string {
  return `Extract structured data from this resume text.
Return ONLY JSON, no markdown. Infer missing fields — never leave them null.

Resume:
${rawText}

Required output:
{
  "name": <string>,
  "skills": [<array of technical and soft skills>],
  "experience_years": <total years as integer>,
  "education": <highest degree + institution as one string>,
  "summary": <2-sentence professional summary, max 150 words>
}`;
}
```

## Batch orchestration — the core engine
```typescript
// screening.ts
import { flashModel } from "./client";
import { buildScreeningPrompt } from "./prompts/screen.prompt";
import { BatchEvalOutput, CandidateEval } from "./schemas";
import { mergeAndRank } from "./merger";
import { ScreeningResult } from "../../db/src";
import type { Job, Applicant } from "../../db/src/types";

const BATCH_SIZE = 25; // max candidates per Gemini call

interface RunScreeningOptions {
  job: Job;
  applicants: Applicant[];
  runId: string;
  onBatchComplete?: (done: number, total: number) => Promise<void>;
}

export async function runScreening({
  job, applicants, runId, onBatchComplete,
}: RunScreeningOptions): Promise<void> {
  const batches = chunk(applicants, BATCH_SIZE);
  const allEvals: (CandidateEval & { applicant_id: string })[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const evals = await evaluateBatch(job, batch);

    // tag each eval with the real applicant _id
    evals.forEach((e) => {
      allEvals.push({ ...e, applicant_id: batch[e.candidate_index]._id.toString() });
    });

    await onBatchComplete?.(i + 1, batches.length);
  }

  const ranked = mergeAndRank(allEvals);

  // Write results — bulk insert for performance
  await ScreeningResult.insertMany(
    ranked.map((r, idx) => ({
      screening_run_id: runId,
      job_id: job._id,
      applicant_id: r.applicant_id,
      rank: idx + 1,
      composite_score: r.composite_score,
      dimension_scores: r.dimension_scores,
      reasoning: {
        strengths: r.strengths,
        gaps: r.gaps,
        recommendation: r.recommendation,
      },
      model_version: "gemini-2.0-flash",
    }))
  );
}

async function evaluateBatch(job: Job, batch: Applicant[]): Promise<CandidateEval[]> {
  const profiles = batch.map(a => a.parsed_profile);
  const prompt = buildScreeningPrompt(job, profiles);

  const result = await flashModel.generateContent(prompt);
  const raw = result.response.text();

  const parsed = BatchEvalOutput.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    // Retry once before failing
    const retry = await flashModel.generateContent(prompt);
    const retryParsed = BatchEvalOutput.parse(JSON.parse(retry.response.text()));
    return retryParsed.evaluations;
  }

  return parsed.data.evaluations;
}

function chunk<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, (i + 1) * size)
  );
}
```

## Cross-batch normalisation — critical for fair ranking
```typescript
// merger.ts
// Without this: candidates in batch-1 compete only with their 24 peers,
// not the full pool. Gemini's scoring baseline shifts between batches.

type EvalWithId = CandidateEval & { applicant_id: string };

export function mergeAndRank(evals: EvalWithId[]): EvalWithId[] {
  if (evals.length === 0) return [];

  const scores = evals.map(e => e.composite_score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  const normalised = evals.map(e => ({
    ...e,
    composite_score: max === min
      ? 100
      : Math.round(((e.composite_score - min) / (max - min)) * 100),
  }));

  return normalised.sort((a, b) => b.composite_score - a.composite_score);
}
```

## Resume normalisation
```typescript
// normalise.ts
import { flashModel } from "./client";
import { buildNormalisePrompt } from "./prompts/normalise.prompt";
import { ParsedProfileSchema, ParsedProfile } from "./schemas";

export async function geminiNormalise(rawText: string): Promise<ParsedProfile> {
  // Gemini 2.0 Flash supports up to 1M tokens - can handle full resume text
  const prompt = buildNormalisePrompt(rawText.slice(0, 50000));
  const result = await flashModel.generateContent(prompt);
  const raw = result.response.text();
  return ParsedProfileSchema.parse(JSON.parse(raw));
}
```

## Prompt engineering principles (follow these)
1. **JSON mode always** — set `responseMimeType: "application/json"` on the model.
   Never parse JSON from markdown code blocks.
2. **Explicit rubric** — include a scoring rubric in the prompt. LLMs drift toward
   high scores without anchoring. Rub in what 0, 50, and 100 mean for each dimension.
3. **Low temperature (0.1)** — screening must be deterministic. Higher temp = noise.
4. **Index candidates from 0** — use explicit `(index: N)` labels so the model's
   `candidate_index` field is unambiguous when returning the array.
5. **Retry on schema validation failure** — one retry before throwing. Log the raw
   response that failed parsing for debugging.
6. **Batch size ≤ 25** — larger batches degrade evaluation quality (model loses
   focus on early candidates). Tested at 10, 25, and 50 — 25 is the sweet spot.
7. **Never pass raw PDF text to screening prompt** — always normalise to
   `ParsedProfile` first. Dirty resume text pollutes the scoring context.

## Do not
- Do not set temperature > 0.2 for screening — results become non-reproducible
- Do not call Gemini for CSV rows that already match the Umurava profile schema
- Do not write raw Gemini output to DB — always validate with zod first
- Do not batch > 25 candidates per call
- Do not expose GEMINI_API_KEY in any frontend bundle
