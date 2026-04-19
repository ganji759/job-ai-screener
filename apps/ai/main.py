from contextlib import asynccontextmanager
from fastapi import FastAPI
from core.gemini import init_gemini
from core.mongo import init_mongo, close_mongo
from core.logging import configure_logging
from routers import screening, normalise


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    init_gemini()
    await init_mongo()
    yield
    await close_mongo()


app = FastAPI(title="Umurava AI Service", version="1.0.0", lifespan=lifespan)
app.include_router(screening.router, prefix="/screening", tags=["screening"])
app.include_router(normalise.router, prefix="/normalise", tags=["normalise"])


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
