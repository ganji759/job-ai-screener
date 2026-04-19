import os
import google.generativeai as genai

_model: genai.GenerativeModel | None = None


def init_gemini() -> None:
    global _model
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY not set")

    genai.configure(api_key=api_key)
    _model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",  # force JSON mode
            temperature=0.1,                         # deterministic scoring
            max_output_tokens=4096,
        ),
    )


def get_model() -> genai.GenerativeModel:
    if _model is None:
        init_gemini()
    assert _model is not None
    return _model
