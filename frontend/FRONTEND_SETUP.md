# HERON Frontend — Setup Guide

## Prerequisites

- Node.js 20+
- Backend API running on port 3001
- Python AI service running on port 8000 (or `AI_SERVICE_URL=` set to empty to use in-process fallback)

## Quick Start

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001/ws/notifications
```

### Step 3: Start Development Server

```bash
npm run dev
```

Frontend starts on **http://localhost:3000**

## Full Stack Startup Order

Run each in a separate terminal:

```bash
# Terminal 1 — Backend API
cd backend
npm run dev

# Terminal 2 — BullMQ Worker (required for screening)
cd backend
npm run worker

# Terminal 3 — Python AI Service
cd backend/apps/ai
.\start.ps1    # Windows
# source .venv/bin/activate && uvicorn main:app --reload --port 8000  # macOS/Linux

# Terminal 4 — Frontend
cd frontend
npm run dev
```

## Available Scripts

```bash
npm run dev         # Development server (port 3000)
npm run dev:clean   # Clear .next cache + dev
npm run build       # Production build
npm run start       # Start production server
npm run lint        # ESLint
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # login, register
│   └── (dashboard)/        # all protected routes
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── store/                  # Redux store + RTK Query APIs
├── types/                  # TypeScript type definitions
├── middleware.ts            # Next.js middleware (auth guard)
├── next.config.mjs          # Next.js configuration
├── tailwind.config.ts       # Tailwind CSS configuration
└── tsconfig.json            # TypeScript configuration
```

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript | Type safety (strict mode) |
| Tailwind CSS | Utility-first styling |
| Redux Toolkit + RTK Query | State management + data fetching |
| React Hook Form + Zod | Form handling + validation |
| Framer Motion | Animations |
| Recharts | Data visualization (score charts) |
| TanStack Table | Sortable/filterable shortlist table |
| Radix UI | Accessible UI primitives |
| lucide-react | Icons |

## Backend Integration

The frontend connects to the Fastify API at:
- **Base URL**: `http://localhost:3001/api/v1`
- **Auth**: `Authorization: Bearer <token>` attached automatically by axios interceptor

All API calls use RTK Query hooks — never raw `fetch()` or `axios` in components.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on API calls | Backend not running. Start `npm run dev` in `backend/` first. |
| Port 3000 already in use | `npm run dev -- -p 3001` |
| Module not found errors | Run `npm install` again |
| Tailwind styles not loading | Restart dev server |
| `.env.local` not found | Create it with the API URL configuration above |
| Screenings stuck in "queued" | BullMQ worker not running. Start `npm run worker` in `backend/`. |
| Agent chat not responding | Python AI service not running, or `AI_SERVICE_URL=` not set for fallback. |
