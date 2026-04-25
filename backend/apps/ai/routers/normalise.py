from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas import ParsedProfile
from services.pdf_parser import parse_pdf
from services.normalise import gemini_normalise

router = APIRouter()


@router.post("/pdf", response_model=ParsedProfile)
async def normalise_pdf(file: UploadFile = File(...)) -> ParsedProfile:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files accepted")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF exceeds 10MB limit")
    return await parse_pdf(content)


@router.post("/text", response_model=ParsedProfile)
async def normalise_text(body: dict) -> ParsedProfile:
    raw = body.get("text", "")
    if not raw:
        raise HTTPException(status_code=400, detail="text field required")
    return await gemini_normalise(raw)
