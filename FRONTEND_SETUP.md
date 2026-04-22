# Frontend Setup Guide - Ardent-Frontend

## ✅ Status: Ready to Run

**Location**: `C:\portfolio\New folder\job-ai-screener-frontend`

**Branch**: Ardent-Frontend

**Framework**: Next.js 14 + React 18 + Tailwind CSS

---

## Prerequisites

- ✅ Node.js 20+ (you have v23.11.0)
- ✅ pnpm (you have v10.33.0)
- ✅ Backend running on port 3001 (already running)

---

## Quick Start

### Step 1: Install Dependencies

```bash
cd "C:\portfolio\New folder\job-ai-screener-frontend"
pnpm install
```

### Step 2: Start Frontend Development Server

```bash
pnpm dev
```

The frontend will start on **http://localhost:3000**

---

## Environment Configuration

The `.env.local` file is already created with:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_BASE_URL=ws://localhost:3001/ws/notifications
```

This connects the frontend to your backend running on port 3001.

---

## Frontend Structure

```
job-ai-screener-frontend/
├── app/                    # Next.js app directory
├── components/             # React components
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── store/                  # Redux store configuration
├── types/                  # TypeScript type definitions
├── src/                    # Source files
├── middleware.ts           # Next.js middleware
├── next.config.mjs         # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

---

## Available Scripts

```bash
# Development server (port 3000)
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Run tests
pnpm test
```

---

## Key Technologies

| Technology | Purpose |
|-----------|---------|
| **Next.js 14** | React framework with SSR/SSG |
| **React 18** | UI library |
| **Tailwind CSS** | Utility-first CSS framework |
| **Redux Toolkit** | State management |
| **React Hook Form** | Form handling |
| **Axios** | HTTP client |
| **Recharts** | Data visualization |
| **Radix UI** | Accessible UI components |
| **Framer Motion** | Animations |

---

## Backend Integration

The frontend connects to the backend API at:
- **Base URL**: `http://localhost:3001/api`
- **Endpoints**: Jobs, Applicants, Screenings

**Make sure the backend is running before starting the frontend!**

---

## Full Stack Setup

### Backend (Running on port 3001)
```
Location: C:\portfolio\New folder\job-ai-screener
Branch: feature/ai-integration
Status: ✅ Running
```

### Frontend (Ready to start on port 3000)
```
Location: C:\portfolio\New folder\job-ai-screener-frontend
Branch: Ardent-Frontend
Status: ⏳ Ready to install
```

---

## Testing the Frontend

1. **Verify Backend is Running**:
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"data":{"status":"ok"},"error":null}`

2. **Install Frontend Dependencies**:
   ```bash
   cd "C:\portfolio\New folder\job-ai-screener-frontend"
   pnpm install
   ```

3. **Start Frontend**:
   ```bash
   pnpm dev
   ```

4. **Access Application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Python AI: http://localhost:8000

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` on API calls | Backend not running. Start it first. |
| Port 3000 already in use | Change port: `pnpm dev -- -p 3001` |
| Module not found errors | Run `pnpm install` again |
| Tailwind styles not loading | Restart dev server |
| `.env.local` not found | Create it with the API URL configuration |

---

## Directory Structure

```
C:\portfolio\New folder\
├── job-ai-screener/              # Backend
│   ├── apps/api/                 # Express API
│   ├── apps/ai/                  # Python AI Service
│   └── packages/db/              # MongoDB schemas
│
└── job-ai-screener-frontend/     # Frontend (This directory)
    ├── app/                      # Next.js pages
    ├── components/               # React components
    ├── store/                    # Redux store
    └── .env.local                # Frontend config
```

---

## Next Steps

1. ✅ Backend is running and healthy
2. ⏳ Install frontend dependencies: `pnpm install`
3. ⏳ Start frontend: `pnpm dev`
4. ⏳ Open http://localhost:3000
5. ⏳ Test the full application

---

## Notes

- Frontend and backend are in **separate directories**
- Frontend connects to backend via API URL in `.env.local`
- All API calls use the base URL: `http://localhost:3001/api`
- Frontend uses Redux for state management
- Tailwind CSS is configured for styling
- TypeScript is enabled for type safety

Enjoy! 🚀
