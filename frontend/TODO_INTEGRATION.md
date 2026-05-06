# HERON Frontend — Integration Status

All RTK Query endpoints are wired to the backend. The frontend is fully integrated and operational.

## Completed

- All pages designed, built, and connected to the backend API
- RTK Query APIs: `jobsApi`, `applicantsApi`, `screeningsApi`, `agentApi`
- Redux store with `authSlice`, `jobsSlice`, `screeningsSlice`
- Forms with React Hook Form + Zod validation
- Dark mode support
- Responsive design
- Auth guard middleware (protected routes redirect to `/login`)
- Screening status polling (every 3 s via RTK Query `pollingInterval`)
- HR recruiter decisions — approve / reject / review per candidate
- "Talk to AI" per candidate — `AiChatModal` + `useCandidateAiChatMutation`
- AI Hiring Assistant — `AgentPanel` + `useAgentChatMutation` + `AgentToolCard`
- Interview scheduling — `ScheduleInterviewModal` + `useCreateInterviewMutation`
- Analytics — HR vs AI confusion matrix + KPI charts
- Acceptance emails — `AcceptanceOutreachPanel` + `useSendAcceptanceEmailsMutation`
- PDF / explanations export
- Head-to-head candidate comparison — `CompareModal`
- Pool insights panel

## Known Gaps / Future Work

- E2E tests (Playwright or Cypress) not yet written
- Unit tests for RTK Query hooks not yet written
- Exponential backoff for screening status polling (currently fixed 3 s interval)
- Keyboard shortcut support
- Loading skeleton screens (some pages use spinner instead)

## Environment

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001/ws/notifications
```

See `INTEGRATION_GUIDE.md` for full endpoint reference and `QUICK_REFERENCE.md` for a condensed RTK Query hook list.
