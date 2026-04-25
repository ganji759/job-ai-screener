import io
import pdfplumber
from schemas import ParsedProfile
from services.normalise import gemini_normalise


async def parse_pdf(file_bytes: bytes) -> ParsedProfile:
    """Extract text from PDF (handles tables + multi-column), normalise via Gemini."""
    text_chunks: list[str] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            text_chunks.append(text)

    raw_text = "\n".join(text_chunks)
    return await gemini_normalise(raw_text)
