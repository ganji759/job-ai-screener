"""Gemini SDK bootstrap.

Reads GEMINI_API_KEY and GEMINI_MODEL from env so the Python AI service stays
aligned with the Node backend's configuration (single source of truth: backend/.env).
"""
from __future__ import annotations

import os

import google.generativeai as genai

_model: genai.GenerativeModel | None = None

_GENERATION_CONFIG = genai.GenerationConfig(
    response_mime_type="application/json",
    temperature=0.1,
    max_output_tokens=8192,
)


def init_gemini() -> None:
    global _model
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    model_name = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    genai.configure(api_key=api_key)
    _model = genai.GenerativeModel(
        model_name=model_name,
        generation_config=_GENERATION_CONFIG,
    )


def get_model() -> genai.GenerativeModel:
    if _model is None:
        init_gemini()
    assert _model is not None
    return _model


def make_model(model_name: str) -> genai.GenerativeModel:
    """Create a model by name, ensuring the SDK is configured first."""
    if _model is None:
        init_gemini()
    return genai.GenerativeModel(model_name=model_name, generation_config=_GENERATION_CONFIG)
