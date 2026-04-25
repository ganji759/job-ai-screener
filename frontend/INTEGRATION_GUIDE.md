# Frontend Integration Guide

## Current State — Integration Complete

All RTK Query endpoints are wired to the backend. The frontend is fully integrated and operational.

## API Base
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```
All requests go through `store/api/baseApi.ts` (axios-based RTK Query `baseQuery`) with `Authorization: Bearer <token>` attached automatically.

## Implemented Endpoints

### Jobs (`store/api/jobsApi.ts`)
```
GET    /jobs                     useGetJobsQuery
POST   /jobs                     useCreateJobMutation
GET    /jobs/:id                 useGetJobQuery
PATCH  /jobs/:id                 useUpdateJobMutation
DELETE /jobs/:id                 useDeleteJobMutation
GET    /jobs/:id/applicants      useGetJobApplicantsQuery
POST   /jobs/:id/applicants      useIngestApplicantsMutation
POST   /jobs/:id/applicants/upload  useUploadApplicantsMutation
```

### Screenings (`store/api/screeningsApi.ts`)
```
GET    /screenings                          useGetScreeningsQuery
POST   /screenings/run-for-job             useRunScreeningForJobMutation
POST   /screenings/platform                useRunPlatformScreeningMutation
POST   /screenings/external                useRunExternalScreeningMutation
GET    /screenings/:id/status              useGetScreeningStatusQuery  (polling)
GET    /screenings/:id/results             useGetScreeningResultsQuery
PUT    /screenings/:id/recruiter-decisions useSaveRecruiterDecisionsMutation
POST   /screenings/:id/send-acceptance-emails  useSendAcceptanceEmailsMutation
POST   /screenings/:id/ai-chat             useCandidateAiChatMutation
POST   /screenings/:id/export              useExportScreeningMutation
DELETE /screenings/:id                     useDeleteScreeningMutation
POST   /screenings/:id/compare             useCompareApplicantsMutation
GET    /screenings/:id/explanations        useGetScreeningExplanationsQuery
GET    /dashboard/analytics                useGetDashboardAnalyticsQuery
```

## Polling Strategy
Status is polled via RTK Query `pollingInterval`. Polling stops when status is `"completed"` or `"failed"`:
```typescript
const { data } = useGetScreeningStatusQuery(id, {
  pollingInterval: done ? 0 : 3000,
  skip: !id,
});
```

## Key Business Logic

### Scoring weights
Must sum to 1.0 (±0.001 tolerance). Validated client-side before submit. Backend also validates.

### Recruiter decisions
Saved via `PUT /screenings/:id/recruiter-decisions` with body:
```typescript
Record<string, { decision: "approved" | "rejected" | "review"; hrNote: string; decidedAt?: string; aiLabel?: string }>
```
Keys are Applicant MongoDB `_id` strings.

### AI chat
`POST /screenings/:id/ai-chat` body:
```typescript
{ candidateId: string; message: string; history?: Array<{ role: "user" | "model"; content: string }> }
```
Returns `{ reply: string }`. Full history sent with each request. Rate-limited to 30/minute.

## Error Codes
| Code | HTTP | Frontend Action |
|------|------|-----------------|
| `NOT_FOUND` | 404 | Show "Not found" |
| `VALIDATION_ERROR` | 400 | Show field errors |
| `WEIGHTS_LOCKED` | 409 | Disable weight inputs |
| `NO_APPLICANTS` | 400 | Show "Add applicants first" |
| `SCREENING_NOT_COMPLETE` | 400 | Show "Still processing" |
| `UNAUTHORIZED` | 401 | Redirect to login |

## Environment Variables
```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```
