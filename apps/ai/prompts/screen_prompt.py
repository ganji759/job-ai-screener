import json
from schemas import Job, ParsedProfile


def build_screening_prompt(job: Job, candidates: list[ParsedProfile]) -> str:
    w = job.scoring_weights
    req = job.requirements

    candidate_blocks = "\n\n".join(
        f"### Candidate {i} (index: {i})\n"
        f"{json.dumps(c.model_dump(), indent=2)}"
        for i, c in enumerate(candidates)
    )

    return f"""You are a senior technical recruiter. Evaluate each candidate strictly and objectively.
Return ONLY a JSON object — no markdown, no explanation, no extra keys.

## Role
Title: {job.title}
Required skills: {", ".join(req.skills)}
Minimum experience: {req.experience_years} years
Education requirement: {req.education_level}
Nice to have: {", ".join(req.nice_to_have) if req.nice_to_have else "none"}

## Scoring weights (must reflect in composite_score)
skills: {w.skills}
experience: {w.experience}
education: {w.education}
cultural_fit: {w.cultural_fit}

composite_score = (skills_score * {w.skills})
                + (experience_score * {w.experience})
                + (education_score * {w.education})
                + (cultural_fit_score * {w.cultural_fit})

## Scoring rubric
skills:       0 = none of the required skills | 50 = half | 100 = all + extras
experience:   0 = no experience | 50 = at threshold | 100 = 2x+ threshold
education:    0 = below requirement | 70 = meets requirement | 100 = exceeds
cultural_fit: infer from summary tone, volunteer work, side projects

## Candidates ({len(candidates)} total)
{candidate_blocks}

## Required JSON output schema
{{
  "evaluations": [
    {{
      "candidate_index": <int matching index above>,
      "dimension_scores": {{
        "skills": <0-100>,
        "experience": <0-100>,
        "education": <0-100>,
        "cultural_fit": <0-100>
      }},
      "composite_score": <0-100 weighted as above>,
      "strengths": [<max 4 concise recruiter-readable strings>],
      "gaps": [<max 3 concise strings, empty array if none>],
      "recommendation": <"Strong hire" | "Consider" | "Reject">
    }}
  ]
}}"""
