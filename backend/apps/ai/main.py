"""Umurava AI Service — FastAPI entry point.

Primary role: Gemini proxy for the Node backend (`POST /ai/generate`). The legacy
`/screening/run` and `/normalise/pdf` routers are still registered so that paths
in `AI_ML.md` keep working if you want to migrate more logic into Python later.
"""
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv()  # pick up repo-root .env before core modules read os.environ

from fastapi import FastAPI  # noqa: E402

from core.gemini import init_gemini  # noqa: E402
from core.logging import configure_logging  # noqa: E402
from core.mongo import close_mongo, init_mongo  # noqa: E402
from routers import ai, agent, normalise, screening  # noqa: E402


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    init_gemini()
    await init_mongo()  # no-op when MONGODB_URI is unset
    yield
    await close_mongo()


app = FastAPI(title="Umurava AI Service", version="1.1.0", lifespan=lifespan)

app.include_router(ai.router, prefix="/ai", tags=["ai"])
app.include_router(agent.router, prefix="/agent", tags=["agent"])
app.include_router(screening.router, prefix="/screening", tags=["screening"])
app.include_router(normalise.router, prefix="/normalise", tags=["normalise"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
