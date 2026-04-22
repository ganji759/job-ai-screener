import asyncio
import re
from fastapi import HTTPException
from schemas import ParsedProfile
from core.gemini import get_model
from prompts.normalise_prompt import build_normalise_prompt


def _extract_json(text: str) -> str:
    """Strip markdown code fences if the model wrapped the JSON anyway."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", text)
    return match.group(1) if match else text


async def gemini_normalise(raw_text: str) -> ParsedProfile:
    prompt = build_normalise_prompt(raw_text[:8000])  # token budget
    model = get_model()
    loop = asyncio.get_event_loop()

    response = await loop.run_in_executor(None, model.generate_content, prompt)
    json_text = _extract_json(response.text)
    try:
        return ParsedProfile.model_validate_json(json_text)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={"error": "gemini_parse_failed", "message": str(exc)},
        ) from exc
