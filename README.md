# Umurava AI HR — Frontend

Production recruiter dashboard for AI-powered talent screening.

## Stack
- Next.js 14 App Router + TypeScript strict
- Tailwind CSS v3
- Redux Toolkit + RTK Query (all server state + mutations)
- React Hook Form + Zod
- Recharts + TanStack Table
- react-dropzone, react-hot-toast, lucide-react, framer-motion

## Quick Start
```bash
cp .env.local.example .env.local
npm install
npm run dev         # port 3000
```

## Environment
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Features
- Auth (login/register with token persistence)
- Jobs lifecycle — create, list, detail, benchmark, stats
- Applicant ingestion — Umurava JSON profiles + CSV/PDF external uploads
- Screening execution, status polling, result exploration
- Shortlist table with score badges, drawer with dimension breakdowns
- **HR decisions** — approve/reject/review each shortlisted candidate
- **"Talk to AI"** — chat with Gemini about any shortlisted candidate; RAG context includes job requirements, scores, and HR decision
- **Analytics dashboard** — KPIs, charts, and HR vs AI confusion matrix (precision/recall/accuracy)
- PDF export + judge-ready explanations export
- Acceptance email sending to approved candidates

## Key Pages
| Route | Description |
|-------|-------------|
| `/jobs` | Job list |
| `/jobs/new` | Create job |
| `/jobs/[id]` | Job detail + applicant ingestion |
| `/screenings` | Screening run list |
| `/screenings/[id]` | Shortlist + HR decisions + "Talk to AI" |
| `/analytics` | Dashboard with confusion matrix + charts |
| `/applicants` | Applicant management |

## "Talk to AI" (AiChatModal)
Opened from the screening detail page per candidate. Sends full conversation history to `POST /api/v1/screenings/:id/ai-chat`. Context includes job requirements, candidate scores/strengths/gaps, and current HR decision. Rate-limited to 30 req/min.

## Analytics — HR vs AI Confusion Matrix
`GET /api/v1/dashboard/analytics` returns `aiVsHrAccuracy`:
- 4-cell confusion matrix (TP/FP/FN/TN)
- Precision, recall, accuracy, agreement rate
- Disagreements table (candidates where AI and HR differed)

Requires completed screenings with saved HR decisions to populate.

## Deployment
- Vercel (set `NEXT_PUBLIC_API_URL` to Railway backend URL)
