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
    # Token budget: most resumes fit in 24k chars; anything longer is almost certainly noise.
    # The earlier 8k cap was truncating real resumes mid-Work-Experience, which is why
    # `experience[]` and `education[]` came back empty.
    trimmed = raw_text[:24000]
    prompt = build_normalise_prompt(trimmed)
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
