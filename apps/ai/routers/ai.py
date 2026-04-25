"""Thin Gemini proxy endpoint.

The Node.js backend (backend/src) builds prompts and validates responses with Zod,
then forwards the raw prompt here for the actual Gemini call. This keeps the AI
execution ecosystem in Python (per the architecture docs) while letting Node stay
the source of truth for business logic.

Request  : POST /ai/generate  { prompt: str, timeoutMs?: int, temperature?: float }
Response : { text: str, model: str }
Errors   : 429 for quota, 504 for timeout, 500 for other Gemini failures.
"""
from __future__ import annotations

import asyncio
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import structlog

from core.gemini import get_model

router = APIRouter()
log = structlog.get_logger()


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    timeoutMs: Optional[int] = Field(default=None, ge=1_000, le=300_000)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class GenerateResponse(BaseModel):
    text: str
    model: str


def _classify_error(err: Exception) -> tuple[int, str]:
    """Map a Gemini SDK error to (http_status, short_code)."""
    raw = str(err)
    if isinstance(err, asyncio.TimeoutError) or "timeout" in raw.lower() or "deadline" in raw.lower():
        return 504, "TIMEOUT"
    if "429" in raw or "RESOURCE_EXHAUSTED" in raw or "quota" in raw.lower() or "rate limit" in raw.lower():
        return 429, "QUOTA_EXCEEDED"
    return 500, "GEMINI_FAILED"


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    """Forward a prompt to Gemini and return the raw text response."""
    model = get_model()
    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    timeout_s = (req.timeoutMs or 30_000) / 1000

    generation_config: dict = {}
    if req.temperature is not None:
        generation_config["temperature"] = req.temperature

    try:
        coro = model.generate_content_async(
            req.prompt,
            generation_config=generation_config or None,
        )
        result = await asyncio.wait_for(coro, timeout=timeout_s)
    except Exception as err:  # noqa: BLE001 - we re-raise as HTTPException below
        status, code = _classify_error(err)
        log.warning("gemini_generate_failed", code=code, error=str(err)[:500])
        raise HTTPException(
            status_code=status,
            detail={"code": code, "message": str(err)[:500]},
        ) from err

    text = getattr(result, "text", "") or ""
    if not text:
        # Some SDK errors surface as empty `text` with a block reason in candidates.
        reason = ""
        try:
            reason = str(result.prompt_feedback)
        except Exception:  # noqa: BLE001
            reason = "unknown"
        log.warning("gemini_empty_response", reason=reason[:200])
        raise HTTPException(
            status_code=502,
            detail={"code": "EMPTY_RESPONSE", "message": f"Gemini returned empty text ({reason[:200]})"},
        )

    return GenerateResponse(text=text, model=model_name)
