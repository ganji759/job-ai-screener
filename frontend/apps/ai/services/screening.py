import asyncio
import structlog
from schemas import (
    ScreeningRequest,
    RankedResult,
    BatchEvalOutput,
    CandidateEval,
    Job,
    ApplicantIn,
)
from core.gemini import generate
from prompts.screen_prompt import build_screening_prompt
from services.merger import merge_and_rank

log = structlog.get_logger()
BATCH_SIZE = 25


async def run_screening(req: ScreeningRequest) -> list[RankedResult]:
    """Orchestrate batched Gemini calls, validate, merge, rank."""
    applicants = req.applicants
    batches = [
        applicants[i : i + BATCH_SIZE]
        for i in range(0, len(applicants), BATCH_SIZE)
    ]

    log.info(
        "screening_started",
        run_id=req.run_id,
        total=len(applicants),
        batches=len(batches),
    )

    tasks = [evaluate_batch(req.job, batch) for batch in batches]
    batch_results = await asyncio.gather(*tasks, return_exceptions=False)

    tagged: list[dict] = []
    for batch, evals in zip(batches, batch_results):
        for ev in evals:
            tagged.append(
                {
                    **ev.model_dump(),
                    "applicant_id": batch[ev.candidate_index].id,
                }
            )

    ranked = merge_and_rank(tagged)
    log.info("screening_complete", run_id=req.run_id, ranked=len(ranked))
    return ranked


async def evaluate_batch(job: Job, batch: list[ApplicantIn]) -> list[CandidateEval]:
    """Single Gemini call for one batch. One retry on validation failure."""
    profiles = [a.parsed_profile for a in batch]
    prompt = build_screening_prompt(job, profiles)
    loop = asyncio.get_event_loop()

    for attempt in range(2):
        try:
            text = await loop.run_in_executor(None, generate, prompt)
            parsed = BatchEvalOutput.model_validate_json(text)
            return parsed.evaluations
        except Exception as e:
            log.warning(
                "batch_eval_retry",
                attempt=attempt,
                error=str(e),
                batch_size=len(batch),
            )
            if attempt == 1:
                raise

    return []
