# Frontend — frontend/

## Stack
- Next.js 14 App Router (no Pages Router), TypeScript strict
- **Redux Toolkit + RTK Query** — all server state, caching, polling, mutations
- Tailwind CSS v3 — utility classes only
- Recharts — score charts (radar, bar, line)
- TanStack Table — sortable/filterable shortlist table
- React Hook Form + Zod — all forms
- react-dropzone — file uploads
- react-hot-toast — toast notifications
- lucide-react — icons
- framer-motion — animations

## Commands
```bash
cd frontend
npm run dev         # Next.js dev server (port 3000)
npm run dev:clean   # clear .next cache + dev
npm run build       # production build
npm run lint        # Next.js lint
```

## Directory layout
```
frontend/
├── app/
│   ├── layout.tsx              # providers: Redux, Toaster
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx          # sidebar, auth guard
│       ├── page.tsx            # redirect → /jobs
│       ├── jobs/               # list, create, detail
│       ├── screenings/
│       │   ├── page.tsx        # screening list
│       │   └── [id]/page.tsx   # screening detail — shortlist + Talk to AI
│       ├── analytics/page.tsx  # HR vs AI matrix + charts
│       └── applicants/
├── components/
│   ├── screenings/
│   │   ├── AiChatModal.tsx     # "Talk to AI" chat window
│   │   ├── RunScreeningModal.tsx
│   │   ├── ShortlistTable.tsx
│   │   └── ...
│   ├── jobs/
│   ├── applicants/
│   └── ui/                     # shared primitives
├── store/
│   ├── index.ts                # Redux store
│   ├── api/
│   │   ├── baseApi.ts          # RTK Query base (axios adapter)
│   │   ├── jobsApi.ts
│   │   ├── applicantsApi.ts
│   │   └── screeningsApi.ts    # includes useCandidateAiChatMutation
│   └── slices/
│       ├── authSlice.ts
│       └── ...
├── hooks/
├── lib/
│   └── axiosBaseQuery.ts       # RTK Query base query using axios
└── types/
    └── index.ts                # mirrors backend DTOs
```

## API integration — RTK Query
`store/api/baseApi.ts` wraps axios with an RTK Query `baseQuery`. All API calls go through RTK Query mutations and queries — never raw `fetch()` or `axios` calls in components.

Base URL: `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3001/api/v1`).

Auth: `Authorization: Bearer <token>` attached by axios interceptor.

## Key RTK Query hooks (screeningsApi)
```typescript
useGetScreeningsQuery()
useRunScreeningMutation()
useRunScreeningForJobMutation()
useGetScreeningStatusQuery(id)      // for polling
useGetScreeningResultsQuery(id)
useSaveRecruiterDecisionsMutation()
useSendAcceptanceEmailsMutation()
useExportScreeningMutation()
useDeleteScreeningMutation()
useCompareApplicantsMutation()
useCandidateAiChatMutation()        // "Talk to AI" chat
useGetDashboardAnalyticsQuery()
```

## "Talk to AI" feature — `AiChatModal.tsx`
Launched from the screening detail page (`/screenings/[id]`) via the "Talk to AI" button on each shortlisted candidate row.

Props: `screeningId, candidateId, candidateName, aiRecommendation, totalScore, jobTitle, onClose`

- Opens a floating chat window (violet gradient header, message bubbles, animated typing indicator)
- First message is a pre-filled greeting with candidate score and AI recommendation
- 4 suggested starter questions shown before first user message
- Sends full conversation history to `POST /screenings/:id/ai-chat` with each message
- Enter to send, Shift+Enter for newline
- `**bold**` markdown rendered safely via HTML escape + regex replace
- Clicking backdrop closes the modal

## Analytics page — `app/(dashboard)/analytics/page.tsx`
**Structure:**
1. **AI vs HR Decision Explainability** — always visible at top, compact layout:
   - 4-cell confusion matrix row (TP / FP / FN / TN with icons)
   - Slim metrics strip (precision, recall, accuracy, agreement rate)
   - Compact disagreements table
2. **KPI cards** — always visible
3. **Screenings Over Time + Score Distribution** — always visible
4. **"See more" toggle** — `ChevronDown/ChevronUp` button reveals remaining ~5 chart sections

## State management rules
- Redux for: `auth` slice (token, user), `jobs` slice (UI state), `screenings` slice (polling flag)
- RTK Query for: all server data fetching, caching, mutations
- No server data in Redux slices; no raw `useEffect` for data fetching

## Polling pattern
RTK Query `pollingInterval` on `useGetScreeningStatusQuery`:
```typescript
const { data } = useGetScreeningStatusQuery(screeningId, {
  pollingInterval: status === "completed" || status === "failed" ? 0 : 3000,
  skip: !screeningId,
});
```

## Routing conventions
- `/jobs` — job list
- `/jobs/new` — create job
- `/jobs/[id]` — job detail
- `/screenings` — screening list
- `/screenings/[id]` — screening detail + shortlist + "Talk to AI"
- `/analytics` — dashboard analytics
- `/applicants` — applicant management

## Responsible AI UI requirement
Every page showing AI output includes:
```tsx
<p className="text-xs text-slate-400">
  AI advice is for reference only — final decisions are yours.
</p>
```

## Do not
- No `fetch()` directly — always use RTK Query hooks
- No inline styles
- No `any` type
- No business logic in Next.js API route handlers — proxy to backend only
- Never call `useCandidateAiChatMutation` outside `AiChatModal`
