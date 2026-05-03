# Umurava AI HR — Frontend

Next.js 14 App Router recruiter dashboard for AI-powered talent screening.

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 App Router + TypeScript strict |
| Styling | Tailwind CSS v3 + Radix UI primitives |
| State | Redux Toolkit + RTK Query (all server data) |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table v8 |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | lucide-react |
| Notifications | react-hot-toast |
| File upload | react-dropzone |
| PDF preview | react-pdf |

## Quick Start

```bash
cp .env.local.example .env.local
npm install
npm run dev         # http://localhost:3000
```

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001/ws/notifications
```

## Pages

| Route | Description |
|-------|-------------|
| `/login` | Login form |
| `/register` | Registration form |
| `/jobs` | Job listing |
| `/jobs/new` | Create job |
| `/jobs/[id]` | Job detail + benchmark + stats |
| `/jobs/[id]/applicants` | Applicant ingestion for a job |
| `/jobs/[id]/screenings` | Screening history for a job |
| `/screenings` | All screenings list |
| `/screenings/[id]` | Shortlist + HR decisions + "Talk to AI" |
| `/screenings/[id]/compare` | Head-to-head candidate comparison |
| `/analytics` | KPIs + HR vs AI confusion matrix |
| `/applicants` | Applicant management |
| `/applicants/[id]` | Applicant profile detail |
| `/reports` | Reports dashboard |
| `/notifications` | Notification centre |
| `/profile` | User profile |
| `/settings` | User settings |

## RTK Query Hooks (key)

```ts
// Jobs
useGetJobsQuery()
useCreateJobMutation()
useGetJobQuery(id)
useUpdateJobMutation()
useDeleteJobMutation()

// Applicants
useGetApplicantsQuery(jobId)
useIngestApplicantsMutation()
useUploadApplicantsMutation()

// Screenings
useGetScreeningsQuery()
useRunScreeningForJobMutation()
useGetScreeningStatusQuery(id)     // auto-polls every 3 s
useGetScreeningResultsQuery(id)
useSaveRecruiterDecisionsMutation()
useCandidateAiChatMutation()       // "Talk to AI" — 30 req/min
useGetScreeningComparisonMutation()
useSendAcceptanceEmailsMutation()

// Analytics
useGetDashboardAnalyticsQuery()
```

## Key Components

### Screenings
- `ScreeningStatusPoller` — polls `GET /screenings/:id/status` every 3 s, triggers refetch on completion
- `ShortlistTable` — ranked candidate table with sort, filter, score badges
- `CandidateDetailDrawer` — full candidate profile + score dimension breakdown
- `ScoreBreakdownChart` — radar / bar chart for skills / experience / education scores
- `AiChatModal` — "Talk to AI" chat window; sends full conversation history + job + candidate context
- `AiAdvisoryModal` — displays AI recommendation with reasoning
- `CompareModal` — head-to-head candidate comparison
- `AcceptanceOutreachPanel` — compose and send acceptance emails to approved candidates
- `PoolInsightsPanel` — aggregate statistics for the candidate pool
- `RunScreeningModal` — trigger a new screening run

### Jobs
- `JobForm` — create / edit job with scoring weight sliders
- `JobCard` — job listing card with status badges
- `JobBenchmarkPanel` — performance metrics across screenings
- `JobStatsPanel` — applicant count and source breakdown
- `JobSubNav` — tab navigation for job detail (overview / applicants / screenings)

### Applicants
- `UmuravaIngestForm` — ingest Umurava platform profiles by username / URL
- `ExternalUploadForm` — drag-and-drop CSV or PDF upload
- `ApplicantTable` — sortable applicant list with filters
- `ApplicantDetailDrawer` — full profile view with parsed resume data
- `ProfilePreviewCard` — compact candidate preview

### Layout
- `AppShell` — sidebar navigation + protected auth guard
- `Header` — top bar with search and notification bell
- `NotificationPanel` — real-time notification dropdown

### Dashboard
- `StatsCards` — KPI metric cards (jobs, applicants, screenings)
- `SkillsHeatmap` — skill demand visualisation across jobs
- `ActivityFeed` — recent platform activity

### Charts
- `ScoreDistribution` — histogram of candidate scores
- `SkillsDemandChart` — skill frequency bar chart

## Features

- **Auth** — login / register with JWT token persistence in Redux store
- **Jobs lifecycle** — create, list, detail, benchmark, stats, delete
- **Applicant ingestion** — Umurava JSON profiles + CSV / PDF bulk upload with preview
- **Async screening** — trigger run, poll status every 3 s, explore results when complete
- **HR decisions** — approve / reject / review per shortlisted candidate; saved server-side
- **"Talk to AI"** — RAG chat with Gemini per candidate; context includes job requirements, dimension scores, strengths / gaps, and current HR decision
- **Analytics** — confusion matrix (TP / FP / FN / TN), precision, recall, accuracy, agreement rate, and disagreement table
- **Exports** — PDF export + judge-ready explanations export
- **Acceptance emails** — send Resend-powered emails to approved candidates from within the app

## "Talk to AI" Detail

Opened from `screenings/[id]` per candidate via `AiChatModal`. Each message sends the full conversation history to `POST /api/v1/screenings/:id/ai-chat`. Server-side context automatically includes job description, required skills, candidate scores, strengths, gaps, and the recruiter's current HR decision. Rate-limited to 30 req / min.

## Analytics — HR vs AI Confusion Matrix

`GET /api/v1/dashboard/analytics` returns `aiVsHrAccuracy`:
- 4-cell confusion matrix: TP (AI shortlisted, HR approved), FP (AI shortlisted, HR rejected), FN (AI excluded, HR approved), TN (both excluded)
- Derived metrics: precision, recall, accuracy, agreement rate
- `disagreements[]` — per-candidate rows where AI and HR differed, with scores

Requires completed screenings with saved HR decisions to populate.

## Deployment

Deploy to Vercel. Set `NEXT_PUBLIC_API_URL` to your Railway backend URL.
