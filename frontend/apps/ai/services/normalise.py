import asyncio
from schemas import ParsedProfile
from core.gemini import generate
from prompts.normalise_prompt import build_normalise_prompt


async def gemini_normalise(raw_text: str) -> ParsedProfile:
    """Raw resume text → validated ParsedProfile via Gemini."""
    prompt = build_normalise_prompt(raw_text[:8000])
    loop = asyncio.get_event_loop()

    text = await loop.run_in_executor(None, generate, prompt)
    return ParsedProfile.model_validate_json(text)
