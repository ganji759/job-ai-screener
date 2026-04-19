import asyncio
from schemas import ParsedProfile
from core.gemini import get_model
from prompts.normalise_prompt import build_normalise_prompt


async def gemini_normalise(raw_text: str) -> ParsedProfile:
    """Raw resume text → validated ParsedProfile via Gemini."""
    prompt = build_normalise_prompt(raw_text[:8000])  # token budget
    model = get_model()
    loop = asyncio.get_event_loop()

    response = await loop.run_in_executor(None, model.generate_content, prompt)
    return ParsedProfile.model_validate_json(response.text)
