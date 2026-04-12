# Frontend — apps/web

## Stack
- Next.js 14 App Router (no Pages Router)
- Redux Toolkit (`@reduxjs/toolkit`) for server-derived state
- Tailwind CSS — utility classes only, no custom CSS files
- `shadcn/ui` for base components (Button, Dialog, Table, Badge, Progress)
- `react-hook-form` + `zod` for all forms
- `axios` with typed interceptors for API calls
- `react-query` (`@tanstack/react-query`) for polling + caching

## Init
```bash
cd apps/web
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
pnpm add @reduxjs/toolkit react-redux @tanstack/react-query axios
pnpm add react-hook-form zod @hookform/resolvers
npx shadcn-ui@latest init
```

## Directory layout
```
apps/web/
├── app/
│   ├── layout.tsx            # providers: Redux, ReactQuery, Toaster
│   ├── page.tsx              # redirect → /jobs
│   ├── jobs/
│   │   ├── page.tsx          # job list
│   │   ├── new/page.tsx      # create job form
│   │   └── [jobId]/
│   │       ├── page.tsx      # job detail + trigger screening
│   │       └── screening/
│   │           └── [runId]/page.tsx  # shortlist results
│   └── api/                  # Next.js route handlers — proxy only, no business logic
├── components/
│   ├── jobs/
│   ├── applicants/
│   ├── screening/
│   └── ui/                   # shadcn re-exports
├── lib/
│   ├── api.ts                # axios instance
│   ├── store.ts              # Redux store
│   └── hooks.ts              # typed useAppDispatch / useAppSelector
└── types/
    └── api.ts                # mirrors backend DTOs
```

## State management rules
Use Redux **only** for:
- `auth` slice (session token, user role)
- `jobs` slice (list + selected job)
- `screening` slice (run status, polling interval)

Use React Query **for**:
- All GET data fetching with caching
- Polling `screening_run` status every 3s until `status === "complete"`

Do NOT put server data in Redux. Redux is for cross-component UI state.

## Key components to build

### `<JobForm />`
- Fields: title, description, skills (tag input), experience_years, education_level,
  nice_to_have, scoring_weights (four sliders summing to 1.0)
- Validate weights sum === 1.0 before submit
- `react-hook-form` with zod schema

### `<ApplicantUpload />`
- Two tabs: "Umurava Profiles" (paste JSON / structured form) | "Upload File" (CSV or PDF)
- File input: accept `.csv,.pdf` only, max 10MB, client-side size check
- Show upload progress bar via axios `onUploadProgress`
- On success: show parsed row count preview before confirming

### `<ShortlistTable />`
- Columns: Rank | Name | Score | Skills match | Experience | Education | Action
- Score rendered as coloured badge (≥80 green, 60–79 amber, <60 red)
- Clicking a row opens `<CandidateReasoningDrawer />`
- Sortable by score column only (ranking is AI-authoritative)

### `<CandidateReasoningDrawer />`
- Slide-in panel (shadcn `Sheet`)
- Sections: composite score dial, dimension score bars, strengths list,
  gaps list, final recommendation chip
- Bottom banner: "AI screening is a decision-support tool. Final hiring
  decisions remain with the recruiter."

### `<ScreeningStatusBanner />`
- Shown on job detail page while `status !== "complete"`
- Shows: "Screening in progress — X of Y batches complete"
- Uses React Query `refetchInterval: 3000`, stops when complete

## Routing conventions
- `/jobs` — list view
- `/jobs/new` — create job
- `/jobs/:jobId` — job detail, applicant list, trigger screening button
- `/jobs/:jobId/screening/:runId` — results page

## API client
```typescript
// lib/api.ts
import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data ?? err)
);
```

## Tailwind conventions
- No arbitrary values `[...]` unless unavoidable
- Colour palette: `slate` for neutrals, `indigo` for primary actions,
  `amber` for warnings, `green` for success, `red` for destructive
- Responsive: mobile-first, breakpoint `md:` for desktop layout shifts

## Responsible AI UI requirement
Every page that shows AI output must include:
```tsx
<p className="text-xs text-slate-500 mt-4 border-t pt-3">
  AI screening is a decision-support tool. Final hiring decisions remain
  with the recruiter.
</p>
```

## Do not
- No `useEffect` for data fetching — use React Query
- No inline styles
- No `fetch()` directly — always use the typed `api` client
- No business logic in route handlers (`app/api/`) — proxy to backend only
