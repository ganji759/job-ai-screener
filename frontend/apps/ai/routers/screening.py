from fastapi import APIRouter, HTTPException
import structlog
from schemas import ScreeningRequest, ScreeningResponse
from services.screening import run_screening

router = APIRouter()
log = structlog.get_logger()


@router.post("/run", response_model=ScreeningResponse)
async def screen_candidates(req: ScreeningRequest) -> ScreeningResponse:
    try:
        results = await run_screening(req)
        return ScreeningResponse(run_id=req.run_id, results=results)
    except Exception as e:
        log.error("screening_failed", run_id=req.run_id, error=str(e))
        raise HTTPException(
            status_code=500,
            detail={"code": "SCREENING_FAILED", "message": str(e)},
        )
