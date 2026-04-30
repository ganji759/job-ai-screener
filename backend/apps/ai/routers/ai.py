"""Thin Gemini proxy endpoint with model cascade.

The Node.js backend (backend/src) builds prompts and validates responses with Zod,
then forwards the raw prompt here for the actual Gemini call. This keeps the AI
execution ecosystem in Python (per the architecture docs) while letting Node stay
the source of truth for business logic.

Request  : POST /ai/generate  { prompt: str, timeoutMs?: int, temperature?: float }
Response : { text: str, model: str }
Errors   : 429 for quota (all models exhausted), 504 for timeout, 500 for other failures.

On quota / rate-limit errors the handler cascades through MODELS in order before
giving up, mirroring the behaviour in services/screening.py.
"""
from __future__ import annotations

import asyncio
import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import structlog

from core.gemini import make_model

router = APIRouter()
log = structlog.get_logger()

_QUOTA_SIGNALS = ("429", "quota", "resource_exhausted", "rate_limit", "exhausted")

# Primary model comes from env; fallbacks are tried in order on quota errors.
# Deduped so setting GEMINI_MODEL to a fallback value doesn't double-try it.
def _cascade_models() -> list[str]:
    primary = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    candidates = [primary, "gemini-2.5-flash-lite", "gemini-2.0-flash"]
    seen: set[str] = set()
    result: list[str] = []
    for m in candidates:
        if m not in seen:
            seen.add(m)
            result.append(m)
    return result


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    timeoutMs: Optional[int] = Field(default=None, ge=1_000, le=300_000)
    temperature: Optional[float] = Field(default=None, ge=0.0, le=2.0)


class GenerateResponse(BaseModel):
    text: str
    model: str


def _is_quota_error(err: Exception) -> bool:
    raw = str(err).lower()
    return any(sig in raw for sig in _QUOTA_SIGNALS)


def _is_timeout_error(err: Exception) -> bool:
    raw = str(err).lower()
    return isinstance(err, asyncio.TimeoutError) or "timeout" in raw or "deadline" in raw


async def _call_model(model_name: str, prompt: str, timeout_s: float, generation_config: dict) -> str:
    """Call one model; returns text on success, raises on any error."""
    model = make_model(model_name)
    coro = model.generate_content_async(
        prompt,
        generation_config=generation_config or None,
    )
    result = await asyncio.wait_for(coro, timeout=timeout_s)

    text = getattr(result, "text", "") or ""
    if not text:
        reason = "unknown"
        try:
            reason = str(result.prompt_feedback)
        except Exception:  # noqa: BLE001
            pass
        log.warning("gemini_empty_response", model=model_name, reason=reason[:200])
        raise HTTPException(
            status_code=502,
            detail={"code": "EMPTY_RESPONSE", "message": f"Gemini returned empty text ({reason[:200]})"},
        )

    return text


@router.post("/generate", response_model=GenerateResponse)
async def generate(req: GenerateRequest) -> GenerateResponse:
    """Forward a prompt to Gemini and return the raw text response.

    Cascades through MODELS on quota/rate-limit errors. Any other error
    (timeout, bad response) is surfaced immediately without cascading.
    """
    timeout_s = (req.timeoutMs or 30_000) / 1000
    generation_config: dict = {}
    if req.temperature is not None:
        generation_config["temperature"] = req.temperature

    models = _cascade_models()
    last_err: Exception | None = None

    for model_name in models:
        try:
            text = await _call_model(model_name, req.prompt, timeout_s, generation_config)
            return GenerateResponse(text=text, model=model_name)
        except HTTPException:
            raise  # EMPTY_RESPONSE from _call_model — don't cascade
        except Exception as err:  # noqa: BLE001
            if _is_timeout_error(err):
                log.warning("gemini_timeout", model=model_name, timeout_s=timeout_s)
                raise HTTPException(
                    status_code=504,
                    detail={"code": "TIMEOUT", "message": f"Gemini timed out after {timeout_s}s on {model_name}"},
                ) from err

            if _is_quota_error(err):
                log.warning("gemini_quota_cascade", from_model=model_name, error=str(err)[:300])
                last_err = err
                continue  # try next model

            # Any other error — surface immediately, no cascade
            log.warning("gemini_generate_failed", model=model_name, error=str(err)[:500])
            raise HTTPException(
                status_code=500,
                detail={"code": "GEMINI_FAILED", "message": str(err)[:500]},
            ) from err

    # Every model hit quota
    log.error("gemini_all_models_exhausted", models=models)
    raise HTTPException(
        status_code=429,
        detail={
            "code": "QUOTA_EXCEEDED",
            "message": f"Gemini quota exhausted on all models ({', '.join(models)}). Try again later.",
        },
    )
