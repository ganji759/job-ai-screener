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
from core.gemini import make_model
from prompts.screen_prompt import build_screening_prompt
from services.merger import merge_and_rank

log = structlog.get_logger()
BATCH_SIZE = 25

MODELS = [
    "gemini-2.5-flash-lite",  # primary — fast + cheap
    "gemini-2.5-flash",        # fallback — more quota
]

_QUOTA_SIGNALS = ("429", "quota", "resource_exhausted", "rate_limit", "exhausted")


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

    # run batches concurrently — asyncio.gather is the speedup
    tasks = [evaluate_batch(req.job, batch) for batch in batches]
    batch_results = await asyncio.gather(*tasks, return_exceptions=False)

    # flatten + tag each eval with the real applicant _id
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


async def _evaluate_with_model(
    model: object, job: Job, batch: list[ApplicantIn]
) -> list[CandidateEval]:
    """Run one batch against a single model. One retry on validation failure."""
    profiles = [a.parsed_profile for a in batch]
    prompt = build_screening_prompt(job, profiles)
    loop = asyncio.get_event_loop()

    for attempt in range(2):
        try:
            response = await loop.run_in_executor(None, model.generate_content, prompt)  # type: ignore[attr-defined]
            parsed = BatchEvalOutput.model_validate_json(response.text)
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

    return []  # unreachable but satisfies type checker


async def evaluate_batch(job: Job, batch: list[ApplicantIn]) -> list[CandidateEval]:
    """Try each model in MODELS; cascade to the next on quota errors."""
    last_error: BaseException | None = None
    for model_name in MODELS:
        try:
            model = make_model(model_name)
            return await _evaluate_with_model(model, job, batch)
        except Exception as e:
            if any(sig in str(e).lower() for sig in _QUOTA_SIGNALS):
                log.warning("model_fallback", from_model=model_name, error=str(e))
                last_error = e
                continue
            raise
    assert last_error is not None
    raise last_error
