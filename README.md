# Umurava AI HR Frontend

Production-ready recruiter frontend for AI-powered talent screening.

## Stack
- Next.js 14 App Router + TypeScript strict mode
- Tailwind CSS v3
- Redux Toolkit + RTK Query
- React Hook Form + Zod
- Recharts + TanStack Table
- react-dropzone, react-hot-toast, lucide-react
- framer-motion animations

## Quick Start
1. `cp .env.local.example .env.local`
2. `npm install`
3. `npm run dev`

## Features
- Auth: login/register with token persistence
- Dashboard analytics and activity
- Jobs lifecycle (list/create/detail/stats/benchmark)
- Scenario 1 ingestion: Umurava structured JSON profiles
- Scenario 2 ingestion: external PDF/CSV/Excel uploads
- Screening execution, polling, comparison, and result exploration
- PDF export + judge-ready explanations export
- Candidate detail drawer and score visualization

## Ingestion Scenarios
```
Scenario 1 (Umurava profiles)
Recruiter -> JSON Profile Input -> Client Validation (Zod) -> /applicants/ingest -> Applicant Table

Scenario 2 (External sources)
Recruiter -> Dropzone Upload (PDF/CSV/XLSX) -> /applicants/upload -> Parser + AI -> Applicant Table
```

## API Integration
- Base URL from `NEXT_PUBLIC_API_URL`
- Axios interceptors attach `Authorization: Bearer <token>`
- RTK Query handles caching, polling, and invalidation

## Innovation UI Highlights
- Live screening status polling
- Score breakdown charts (radar + bars)
- Compare modal for AI head-to-head decisions
- Confidence visualization and shortlist quality exploration
- Judge-ready explanations PDF export endpoint support

## Deployment
- Deploy frontend to Vercel
- Set `NEXT_PUBLIC_API_URL` to Railway backend URL
- Enable Vercel Analytics for production insights
