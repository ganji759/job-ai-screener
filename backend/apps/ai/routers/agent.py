"""Agent turn endpoint — one Gemini function-calling turn per request.

Node.js maintains the Gemini-format `contents` array (user messages, model
function-call parts, function-response parts) and sends the full array here.
Python makes ONE `generate_content` call with the hardcoded tool declarations
and returns either a list of function calls the model wants to make, or the
final text reply. The loop and tool execution live in Node because the data
layer (MongoDB, interview service) is there.

Request:  POST /agent/turn  { contents: list[Content], timeout_ms?: int }
Response: AgentTurnResponse  { type: "tool_calls"|"text", ... }
"""
from __future__ import annotations

import asyncio
import os
from typing import Any, Literal

import google.generativeai as genai
import google.generativeai.protos as glm
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import structlog

router = APIRouter()
log = structlog.get_logger()

_QUOTA_SIGNALS = ("429", "quota", "resource_exhausted", "rate_limit", "exhausted")


def _is_quota_error(err: Exception) -> bool:
    return any(sig in str(err).lower() for sig in _QUOTA_SIGNALS)


_FUNCTION_CALLING_UNSUPPORTED = {"gemini-2.5-flash-lite"}


def _cascade_models() -> list[str]:
    primary = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    # gemini-2.5-flash-lite does not support tools/systemInstruction in v1 — exclude always
    candidates = [primary, "gemini-2.5-flash", "gemini-2.0-flash"]
    seen: set[str] = set()
    result: list[str] = []
    for m in candidates:
        if m not in seen and m not in _FUNCTION_CALLING_UNSUPPORTED:
            seen.add(m)
            result.append(m)
    return result


# ── Tool declarations — mirrors backend/src/services/agent.service.ts ─────────

_FUNCTION_DECLARATIONS = [
    glm.FunctionDeclaration(
        name="list_jobs",
        description="List all jobs created by this recruiter, optionally filtered by status.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "status": glm.Schema(type=glm.Type.STRING, description="Filter by job status: active, draft, or closed."),
                "limit": glm.Schema(type=glm.Type.NUMBER, description="Maximum number of jobs to return (default 10, max 50)."),
            },
        ),
    ),
    glm.FunctionDeclaration(
        name="get_job_details",
        description="Get full details for a specific job including requirements, skills, and applicant count.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "jobId": glm.Schema(type=glm.Type.STRING, description="The job's MongoDB _id."),
            },
            required=["jobId"],
        ),
    ),
    glm.FunctionDeclaration(
        name="get_applicants",
        description="List applicants for a specific job with their name, email, and status.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "jobId": glm.Schema(type=glm.Type.STRING, description="The job's MongoDB _id."),
                "limit": glm.Schema(type=glm.Type.NUMBER, description="Max applicants to return (default 20, max 100)."),
            },
            required=["jobId"],
        ),
    ),
    glm.FunctionDeclaration(
        name="search_applicants",
        description="Search for applicants by name across all jobs (or within a specific job). Use this whenever the recruiter mentions a candidate by name and you need their ID or email.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "name": glm.Schema(type=glm.Type.STRING, description="Partial or full name to search for (case-insensitive)."),
                "jobId": glm.Schema(type=glm.Type.STRING, description="Limit search to a specific job (optional)."),
            },
            required=["name"],
        ),
    ),
    glm.FunctionDeclaration(
        name="list_screenings",
        description="List AI screening runs for this recruiter, optionally filtered by status.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "status": glm.Schema(type=glm.Type.STRING, description="Filter by status: queued, running, completed, failed."),
                "jobId": glm.Schema(type=glm.Type.STRING, description="Filter screenings by a specific job ID."),
                "limit": glm.Schema(type=glm.Type.NUMBER, description="Max screenings to return (default 10, max 50)."),
            },
        ),
    ),
    glm.FunctionDeclaration(
        name="get_screening_results",
        description="Get the ranked shortlist and scores from a completed AI screening run.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "screeningId": glm.Schema(type=glm.Type.STRING, description="The screening's MongoDB _id."),
                "limit": glm.Schema(type=glm.Type.NUMBER, description="Max candidates to include (default 10, max 20)."),
            },
            required=["screeningId"],
        ),
    ),
    glm.FunctionDeclaration(
        name="list_interviews",
        description="List interviews scheduled by this recruiter, optionally filtered by status.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "status": glm.Schema(type=glm.Type.STRING, description="Filter by status: pending, confirmed, cancelled, completed."),
                "limit": glm.Schema(type=glm.Type.NUMBER, description="Max interviews to return (default 10, max 50)."),
            },
        ),
    ),
    glm.FunctionDeclaration(
        name="get_pipeline_summary",
        description="Get a high-level overview of the recruiter's hiring pipeline: job counts, applicant totals, pending screenings, and upcoming interviews.",
        parameters=glm.Schema(type=glm.Type.OBJECT, properties={}),
    ),
    glm.FunctionDeclaration(
        name="schedule_interview",
        description="Schedule an interview for a candidate. Sends an invite email with calendar attachment.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "applicantId": glm.Schema(type=glm.Type.STRING, description="MongoDB _id of the Applicant document."),
                "candidateName": glm.Schema(type=glm.Type.STRING, description="Full name of the candidate."),
                "candidateEmail": glm.Schema(type=glm.Type.STRING, description="Email address of the candidate."),
                "jobId": glm.Schema(type=glm.Type.STRING, description="MongoDB _id of the Job."),
                "jobTitle": glm.Schema(type=glm.Type.STRING, description="Title of the job."),
                "screeningId": glm.Schema(type=glm.Type.STRING, description="MongoDB _id of the Screening (optional)."),
                "interviewType": glm.Schema(type=glm.Type.STRING, description="Format: video, phone, or in-person."),
                "proposedSlots": glm.Schema(
                    type=glm.Type.ARRAY,
                    description="1-3 proposed time slots in ISO 8601 UTC format.",
                    items=glm.Schema(
                        type=glm.Type.OBJECT,
                        properties={
                            "start": glm.Schema(type=glm.Type.STRING, description="Start time ISO 8601 UTC."),
                            "end": glm.Schema(type=glm.Type.STRING, description="End time ISO 8601 UTC."),
                        },
                        required=["start", "end"],
                    ),
                ),
                "meetingLink": glm.Schema(type=glm.Type.STRING, description="Optional video conference link."),
                "notes": glm.Schema(type=glm.Type.STRING, description="Optional notes for the candidate."),
                "title": glm.Schema(type=glm.Type.STRING, description="Custom interview title (optional)."),
            },
            required=["applicantId", "candidateName", "candidateEmail", "jobId", "jobTitle", "interviewType", "proposedSlots"],
        ),
    ),
    glm.FunctionDeclaration(
        name="approve_candidate",
        description="Set the HR decision for a candidate in a screening (approve, reject, or mark for review). Use this when the recruiter says 'accept', 'approve', 'reject', or 'mark for review'.",
        parameters=glm.Schema(
            type=glm.Type.OBJECT,
            properties={
                "screeningId": glm.Schema(type=glm.Type.STRING, description="The screening's MongoDB _id."),
                "applicantId": glm.Schema(type=glm.Type.STRING, description="The Applicant document's MongoDB _id."),
                "decision": glm.Schema(type=glm.Type.STRING, description="The HR decision: approved, rejected, or review."),
                "hrNote": glm.Schema(type=glm.Type.STRING, description="Optional note from the recruiter."),
            },
            required=["screeningId", "applicantId", "decision"],
        ),
    ),
]

_TOOLS = [genai.protos.Tool(function_declarations=_FUNCTION_DECLARATIONS)]

SYSTEM_INSTRUCTION = (
    "You are an AI hiring assistant for the Umurava HR platform. "
    "You help recruiters manage their entire hiring pipeline hands-free. "
    "Critical rules: "
    "NEVER ask the recruiter for an ID — always look IDs up yourself using tools. "
    "Need a job ID? Call list_jobs. Need an applicant ID? Call search_applicants (by name) or get_applicants (by jobId). "
    "Need a screening ID? Call list_screenings. "
    "NEVER say you cannot search the database — you have tools that can. "
    "Chain tool calls automatically: if asked to schedule an interview for John Smith, first call search_applicants, then schedule_interview. "
    "If asked to accept/approve/reject a candidate, first call search_applicants to get their applicantId, then list_screenings to get the screeningId, then call approve_candidate. "
    "Default interview type to video if not specified. Default slot duration to 1 hour if not specified. "
    "Present results clearly with bullet points. Be concise. Never invent data."
)


# ── Schemas ────────────────────────────────────────────────────────────────────

class ContentPart(BaseModel):
    text: str | None = None
    function_call: dict[str, Any] | None = None
    function_response: dict[str, Any] | None = None


class Content(BaseModel):
    role: str
    parts: list[ContentPart]


class AgentTurnRequest(BaseModel):
    contents: list[Content]
    timeout_ms: int = Field(default=30_000, ge=1_000, le=120_000)


class FunctionCallResult(BaseModel):
    name: str
    args: dict[str, Any]


class AgentTurnResponse(BaseModel):
    type: Literal["tool_calls", "text"]
    calls: list[FunctionCallResult] | None = None
    reply: str | None = None
    model: str | None = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def _build_contents(contents: list[Content]) -> list[glm.Content]:
    """Convert Pydantic Content list to Gemini proto Content list."""
    result: list[glm.Content] = []
    for c in contents:
        parts: list[glm.Part] = []
        for p in c.parts:
            if p.text is not None:
                parts.append(glm.Part(text=p.text))
            elif p.function_call is not None:
                fc = p.function_call
                parts.append(glm.Part(function_call=glm.FunctionCall(
                    name=fc.get("name", ""),
                    args=fc.get("args", {}),
                )))
            elif p.function_response is not None:
                fr = p.function_response
                parts.append(glm.Part(function_response=glm.FunctionResponse(
                    name=fr.get("name", ""),
                    response=fr.get("response", {}),
                )))
        if parts:
            result.append(glm.Content(role=c.role, parts=parts))
    return result


async def _run_turn(model_name: str, contents: list[glm.Content], timeout_s: float) -> tuple[str, Any]:
    """Make one generate_content call. Returns (model_name, response)."""
    model = genai.GenerativeModel(
        model_name=model_name,
        tools=_TOOLS,
        system_instruction=SYSTEM_INSTRUCTION,
    )
    coro = model.generate_content_async(contents)
    response = await asyncio.wait_for(coro, timeout=timeout_s)
    return model_name, response


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post("/turn", response_model=AgentTurnResponse)
async def agent_turn(req: AgentTurnRequest) -> AgentTurnResponse:
    """Execute one Gemini function-calling turn and return tool calls or text."""
    timeout_s = req.timeout_ms / 1000
    contents = _build_contents(req.contents)

    if not contents:
        raise HTTPException(status_code=400, detail={"code": "EMPTY_CONTENTS", "message": "contents must not be empty"})

    models = _cascade_models()
    last_err: Exception | None = None

    for model_name in models:
        try:
            used_model, response = await _run_turn(model_name, contents, timeout_s)

            # Check for function calls first
            try:
                fn_calls = response.candidates[0].content.parts if response.candidates else []
                tool_calls = [p.function_call for p in fn_calls if p.function_call.name]
            except Exception:  # noqa: BLE001
                tool_calls = []

            if tool_calls:
                return AgentTurnResponse(
                    type="tool_calls",
                    calls=[FunctionCallResult(name=fc.name, args=dict(fc.args)) for fc in tool_calls],
                    model=used_model,
                )

            # Otherwise return text
            try:
                reply = response.text
            except Exception:  # noqa: BLE001
                reply = ""

            if not reply:
                log.warning("agent_empty_text_response", model=model_name)
                reply = "I completed the requested action."

            return AgentTurnResponse(type="text", reply=reply, model=used_model)

        except asyncio.TimeoutError as err:
            log.warning("agent_turn_timeout", model=model_name, timeout_s=timeout_s)
            raise HTTPException(
                status_code=504,
                detail={"code": "TIMEOUT", "message": f"Gemini timed out after {timeout_s}s on {model_name}"},
            ) from err
        except Exception as err:  # noqa: BLE001
            if _is_quota_error(err):
                log.warning("agent_turn_quota_cascade", from_model=model_name, error=str(err)[:300])
                last_err = err
                continue
            log.error("agent_turn_failed", model=model_name, error=str(err)[:500])
            raise HTTPException(
                status_code=500,
                detail={"code": "GEMINI_FAILED", "message": str(err)[:500]},
            ) from err

    raise HTTPException(
        status_code=429,
        detail={
            "code": "QUOTA_EXCEEDED",
            "message": f"Gemini quota exhausted on all models ({', '.join(models)}). Try again later.",
        },
    )
