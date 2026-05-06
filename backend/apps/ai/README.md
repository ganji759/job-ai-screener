# HERON — Python AI Service

FastAPI service that owns every Gemini call the Node backend makes. Handles batch candidate screening, PDF parsing, score normalisation, agent turn execution, and a thin Gemini proxy used by the Node backend.

## Architecture

```
Next.js frontend (:3000)
        │  HTTP
        ▼
Node backend (:3001)   ← auth, DB, routes, prompt building, Zod validation, agent tool execution
        │  HTTP  POST /ai/generate  |  POST /agent/turn
        ▼
Python AI service (:8000)   ← google-generativeai, pdfplumber
        │
        ▼
  Google Gemini
```

The Node backend builds every prompt and validates JSON responses with Zod. It forwards only the raw prompt text (or Gemini Content objects for agent turns) to this service. Business logic stays in TypeScript; the Gemini SDK and Python ML ecosystem (pdfplumber, future embeddings) live here.

## Endpoints

| Method | Path | Used by | Description |
|--------|------|---------|-------------|
| GET  | `/health`         | Any          | Liveness probe: `{"status":"ok"}` |
| POST | `/ai/generate`    | Node backend | Thin Gemini proxy. Body: `{ prompt, timeoutMs?, temperature? }`. Response: `{ text, model }` |
| POST | `/agent/turn`     | Node backend | Single Gemini generate_content call with tool declarations. Returns `{ type: "tool_calls", calls }` or `{ type: "text", reply }` |
| POST | `/screening/run`  | (legacy)     | End-to-end screening in Python — not used by current Node backend |
| POST | `/normalise/pdf`  | Node backend | PDF → ParsedProfile via pdfplumber + Gemini |
| POST | `/normalise/text` | Node backend | Free text → ParsedProfile |

Only `/health`, `/ai/generate`, and `/agent/turn` are required by the running Node backend.

## Local Development (Windows)

```powershell
cd backend\apps\ai
.\start.ps1
```

The script:
1. Creates `.venv` on first run.
2. Installs `requirements.txt`.
3. Loads `backend\.env` into the process environment (`GEMINI_API_KEY`, `GEMINI_MODEL` come from the same source of truth as Node).
4. Runs `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`.

## Local Development (macOS / Linux)

```bash
cd backend/apps/ai
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Export the same env vars the Node backend uses
export $(grep -v '^#' ../../.env | xargs)

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Disabling the Python Path

Set `AI_SERVICE_URL=` (empty string) in `backend/.env` and restart the Node backend. Node falls back to the in-process `@google/generative-ai` SDK automatically — no code change needed.

## Health Check

```powershell
# Liveness
curl http://localhost:8000/health
# {"status":"ok"}

# Smoke test Gemini proxy
curl -X POST http://localhost:8000/ai/generate `
  -H "Content-Type: application/json" `
  -d '{"prompt":"Return JSON: {\"ok\": true}","timeoutMs":10000}'
# {"text":"{\"ok\": true}", "model":"gemini-2.5-flash"}
```

## Agent Turn — Model Cascade

The `/agent/turn` endpoint uses a quota-aware model cascade:

1. `GEMINI_MODEL` (env var, default `gemini-2.5-flash`)
2. `gemini-2.5-flash` (fallback)
3. `gemini-2.0-flash` (final fallback)

`gemini-2.5-flash-lite` is always excluded — it does not support function calling or `systemInstruction`.

## Environment Variables

The service reads these from the environment (loaded by `start.ps1` or exported manually):

```bash
GEMINI_API_KEY=        # Required — Google AI Studio key
GEMINI_MODEL=gemini-2.5-flash
MONGODB_URI=           # Required by legacy /screening/run endpoint
```

## Deployment

Deployed on Railway using the `Dockerfile` in this directory. The Node backend reaches it over Railway private networking:

```
AI_SERVICE_URL=http://ai-service.railway.internal:8000
```

Never expose this service publicly — it has no auth.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `GEMINI_API_KEY not set` on startup | Ensure `backend/.env` has the key; `start.ps1` reads it automatically |
| `429 QUOTA_EXCEEDED` from Node | Wait for quota reset, or change `GEMINI_MODEL` in `backend/.env` |
| `Python AI service at http://localhost:8000 is not reachable` | Start this service, or set `AI_SERVICE_URL=` in `backend/.env` to use the in-process fallback |
| Port 8000 in use | Run `uvicorn main:app --port 8001` and update `AI_SERVICE_URL` in `.env` |
| Agent turns returning wrong model | Check `GEMINI_MODEL` env var; `gemini-2.5-flash-lite` is blocked — use `gemini-2.5-flash` or `gemini-2.0-flash` |
