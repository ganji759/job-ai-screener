# HERON Frontend — Quick Reference

## API Endpoints

### Jobs
```
GET    /jobs                          useGetJobsQuery
POST   /jobs                          useCreateJobMutation
GET    /jobs/:id                      useGetJobQuery
PATCH  /jobs/:id                      useUpdateJobMutation
DELETE /jobs/:id                      useDeleteJobMutation
```

### Applicants
```
GET    /jobs/:jobId/applicants        useGetJobApplicantsQuery
POST   /jobs/:jobId/applicants        useIngestApplicantsMutation
POST   /jobs/:jobId/applicants/upload useUploadApplicantsMutation
```

### Screenings
```
GET    /screenings                              useGetScreeningsQuery
POST   /screenings/run-for-job                 useRunScreeningForJobMutation
POST   /screenings/platform                    useRunPlatformScreeningMutation
POST   /screenings/external                    useRunExternalScreeningMutation
GET    /screenings/:id/status                  useGetScreeningStatusQuery (poll every 3s)
GET    /screenings/:id/results                 useGetScreeningResultsQuery
PUT    /screenings/:id/recruiter-decisions     useSaveRecruiterDecisionsMutation
POST   /screenings/:id/send-acceptance-emails  useSendAcceptanceEmailsMutation
POST   /screenings/:id/ai-chat                 useCandidateAiChatMutation
POST   /screenings/:id/export                  useExportScreeningMutation
DELETE /screenings/:id                         useDeleteScreeningMutation
POST   /screenings/:id/compare                 useCompareApplicantsMutation
GET    /screenings/:id/explanations            useGetScreeningExplanationsQuery
```

### Dashboard
```
GET    /dashboard/analytics           useGetDashboardAnalyticsQuery
```

## Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `AiChatModal` | `components/screenings/AiChatModal.tsx` | "Talk to AI" chat window |
| `RunScreeningModal` | `components/screenings/RunScreeningModal.tsx` | Screening trigger |
| `ShortlistTable` | `components/screenings/ShortlistTable.tsx` | Ranked candidate list |

## Pages
| Route | File |
|-------|------|
| `/jobs` | `app/(dashboard)/jobs/page.tsx` |
| `/screenings` | `app/(dashboard)/screenings/page.tsx` |
| `/screenings/[id]` | `app/(dashboard)/screenings/[id]/page.tsx` |
| `/analytics` | `app/(dashboard)/analytics/page.tsx` |
| `/applicants` | `app/(dashboard)/applicants/page.tsx` |

## RTK Query Tags
`"Jobs"`, `"Applicants"`, `"Screenings"`, `"Dashboard"`

Invalidated by mutations automatically. Manual cache invalidation: `dispatch(screeningsApi.util.invalidateTags(["Screenings"]))`.

## Environment
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Polling
```typescript
useGetScreeningStatusQuery(id, {
  pollingInterval: isDone ? 0 : 3000,
  skip: !id,
})
```

## AI Chat (rate-limited: 30/min)
```typescript
const [chat, { isLoading }] = useCandidateAiChatMutation();
await chat({ screeningId, candidateId, message, history }).unwrap();
// returns { reply: string }
```

## HR Decisions key format
`recruiterDecisions` is keyed by Applicant MongoDB `_id` (not `profile.id`).
```typescript
{ [applicantMongoId]: { decision: "approved"|"rejected"|"review", hrNote: string } }
```
