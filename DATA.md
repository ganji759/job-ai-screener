# Data Storage — MongoDB + Mongoose

## Stack
- MongoDB Atlas (M0 free tier)
- Mongoose 8 with TypeScript (`mongoose` + `InferSchemaType`)
- Indexes defined on schema, not applied manually

## Connection — `connectWithRetry`
```typescript
// backend/src/index.ts
async function connectWithRetry(uri: string, maxAttempts = 10): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, maxPoolSize: 10 });
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = Math.min(1000 * 2 ** attempt, 30_000);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

> **VPN caveat**: MongoDB SRV strings (`mongodb+srv://`) resolve via DNS and may fail behind corporate VPN. Use the direct multi-host form:
> `mongodb://user:pass@ac-xxx.mongodb.net:27017,ac-yyy.mongodb.net:27017,ac-zzz.mongodb.net:27017/umurava?authSource=admin&ssl=true`

Call `connectWithRetry` once at app startup and once at worker startup. Never call per-request.

## Key models (Mongoose schemas)

### Screening document (`Screening` model)
The primary model for a screening run. Stores everything inline — not split into `ScreeningRun` + `ScreeningResult`:
- `jobId`, `recruiterId`, `status` (`"queued" | "running" | "complete" | "failed"`)
- `results.shortlist[]` — ranked candidates with `candidateId` (= `profile.id`, the Umurava platform string), `totalScore`, `recommendation`, `strengths[]`, `gaps[]`, dimension scores
- `results.allResults[]` — full pool before shortlisting
- `recruiterDecisions` — `Record<string, { decision, hrNote, decidedAt, aiLabel }>` keyed by Applicant MongoDB `_id`
- `jobTitle`, `jobDomain`, `totalAnalyzed`, `shortlistedCount`, `averageScore`, `durationMs`

### Applicant model
- `_id` — MongoDB ObjectId (used as key in `recruiterDecisions`)
- `jobId`, `source` (`"umurava_platform" | "upload_csv" | "resume_pdf"`)
- `profile` — Umurava profile object with `.id` (the Umurava platform string, used as `candidateId` in screening results)
- `status` (`"pending" | "screened"`)

### Job model
- `_id`, `recruiterId`, `title`, `description`, `domain`
- `requirements`: `{ skills[], experienceYears, educationLevel, niceToHave[] }`
- `scoringWeights`: `{ skills, experience, education }` (sum to 1.0)
- `status`, soft-delete via `deletedAt`

## ID mismatch — critical to understand
`results.shortlist[n].candidateId` stores `profile.id` (the Umurava platform ID string, e.g. `"user-abc123"`), but `recruiterDecisions` is keyed by Applicant MongoDB `_id`.

When joining these (e.g. in the confusion matrix), fetch applicants and build a join map:
```typescript
const profileIdToMongo = new Map<string, { mongoId: string; name: string }>();
for (const applicant of applicants) {
  const pid = String((applicant.profile as { id?: string }).id ?? "");
  if (pid) profileIdToMongo.set(pid, { mongoId: String(applicant._id), name: ... });
}
// Then resolve:
const mongoId = profileIdToMongo.get(candidate.candidateId)?.mongoId ?? candidate.candidateId;
const hrEntry = recruiterDecisions[mongoId];
```

## Query patterns

```typescript
// Get shortlist for a completed screening
const screening = await Screening.findById(id).lean();
const shortlist = screening.results?.shortlist ?? [];

// Paginate applicants for a job
const applicants = await Applicant
  .find({ jobId })
  .sort({ createdAt: -1 })
  .skip(offset)
  .limit(limit)
  .lean();

// List jobs (exclude deleted)
const jobs = await Job
  .find({ deletedAt: null, recruiterId })
  .sort({ createdAt: -1 })
  .lean();

// Applicant join for ID resolution
const applicants = await Applicant
  .find({ jobId: { $in: jobIds } })
  .select("_id profile.id profile.firstName profile.lastName")
  .lean();
```

## Atlas setup
1. Create free M0 cluster
2. Create DB user with `readWrite` on `umurava` database only
3. Whitelist `0.0.0.0/0` for dev; scope to deployment IPs in production
4. Use direct connection string (not SRV) if behind VPN

## Do not
- No raw MongoDB driver — use Mongoose models exclusively
- No `Model.findOne()` without `.lean()` on read-only paths
- Never store API keys, tokens, or secrets in any document
- Do not use `Model.save()` inside loops — use `insertMany` or `bulkWrite`
- Do not mutate `recruiterDecisions` entries — always merge, never overwrite whole map
