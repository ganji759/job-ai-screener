# Umurava AI Service (Python)

FastAPI service that owns every Gemini call the Node backend makes.

## Architecture

```
Next.js frontend (port 3000)
        │  HTTP
        ▼
Node backend  (port 3001)   ← auth, DB, routes, prompt building, Zod validation
        │  HTTP  POST /ai/generate
        ▼
Python AI service (port 8000)   ← google-generativeai, pdfplumber
        │
        ▼
  Google Gemini
```

The Node backend (`backend/src`) builds every prompt and validates the JSON response
with Zod schemas. It forwards only the raw prompt text to this service. That way
business logic stays in TypeScript while the Gemini SDK / Python ML ecosystem
(embeddings, pdfplumber, etc.) stays here.

## Endpoints

| Method | Path | Used by | Description |
|---|---|---|---|
| GET  | `/health`         | Any          | Liveness probe: `{"status":"ok"}` |
| POST | `/ai/generate`    | Node backend | Thin Gemini proxy. Request: `{ prompt, timeoutMs?, temperature? }`. Response: `{ text, model }` |
| POST | `/screening/run`  | (legacy)     | End-to-end screening in Python (not used by current Node) |
| POST | `/normalise/pdf`  | (legacy)     | PDF → ParsedProfile via pdfplumber + Gemini |
| POST | `/normalise/text` | (legacy)     | Free text → ParsedProfile |

Only `/health` and `/ai/generate` are required by the running Node backend.

## Local development (Windows)

```powershell
cd backend\apps\ai
.\start.ps1
```

The script:
1. Creates `.venv` on first run.
2. Installs `requirements.txt`.
3. Loads `backend\.env` into the process environment (so `GEMINI_API_KEY`,
   `GEMINI_MODEL` come from the same single source of truth as Node).
4. Runs `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`.

## Local development (macOS / Linux)

```bash
cd backend/apps/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Export the same Gemini env vars the Node backend uses
export $(grep -v '^#' ../../.env | xargs)

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## How to disable the Python path

Set `AI_SERVICE_URL=` (empty) in `backend\.env` and restart the Node backend.
Node will fall back to the in-process `@google/generative-ai` SDK. No code change
needed.

## Health check

```powershell
curl http://localhost:8000/health
# {"status":"ok"}

curl -X POST http://localhost:8000/ai/generate `
  -H "Content-Type: application/json" `
  -d '{"prompt":"Return JSON: {\"ok\": true}","timeoutMs":10000}'
# {"text":"{\"ok\": true}", "model":"gemini-2.5-flash"}
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `GEMINI_API_KEY not set` on startup | Ensure `backend\.env` has the key; the start script reads it. |
| `429` / `QUOTA_EXCEEDED` from Node | Wait, or change `GEMINI_MODEL` in `backend\.env`. |
| `Python AI service at http://localhost:8000 is not reachable` | Start this service, or set `AI_SERVICE_URL=` in `backend\.env`. |
| Port 8000 in use | `uvicorn main:app --port 8001` and update `AI_SERVICE_URL`. |
