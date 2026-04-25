import os
from google import genai
from google.genai import types

_client: genai.Client | None = None
_generation_config = types.GenerateContentConfig(
    response_mime_type="application/json",
    temperature=0.1,
    max_output_tokens=4096,
)
MODEL_NAME = "gemini-2.5-flash"


def init_gemini() -> None:
    global _client
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")
    _client = genai.Client(api_key=api_key)


def get_client() -> genai.Client:
    if _client is None:
        init_gemini()
    assert _client is not None
    return _client


def generate(prompt: str) -> str:
    """Synchronous Gemini call — wrap in run_in_executor for async contexts."""
    client = get_client()
    response = client.models.generate_content(
        model=MODEL_NAME,
        contents=prompt,
        config=_generation_config,
    )
    return response.text
