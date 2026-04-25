import json
from schemas import Job, ParsedProfile


def _summarise_candidate(i: int, c: ParsedProfile) -> str:
    skill_lines = ", ".join(
        f"{s.name} ({s.level}, {s.yearsOfExperience}yr)" for s in c.skills[:8]
    )
    exp_lines = "\n".join(
        f"  - {e.role} @ {e.company} ({e.startDate}–{e.endDate}): {e.description[:120]}"
        for e in c.experience[:4]
    )
    edu_lines = " | ".join(
        f"{e.degree} in {e.fieldOfStudy} @ {e.institution} ({e.endYear})"
        for e in c.education[:2]
    )
    cert_lines = ", ".join(f"{cert.name} ({cert.issuer})" for cert in (c.certifications or [])[:3])
    project_lines = "\n".join(
        f"  - {p.name}: {p.description[:100]} [{', '.join(p.technologies[:4])}]"
        for p in c.projects[:3]
    )

    return (
        f"### Candidate {i} (index: {i})\n"
        f"Name: {c.firstName} {c.lastName}\n"
        f"Headline: {c.headline}\n"
        f"Location: {c.location}\n"
        f"Availability: {c.availability.status} · {c.availability.type}\n"
        f"Skills: {skill_lines or 'none listed'}\n"
        f"Experience:\n{exp_lines or '  none listed'}\n"
        f"Education: {edu_lines or 'not specified'}\n"
        + (f"Certifications: {cert_lines}\n" if cert_lines else "")
        + (f"Projects:\n{project_lines}\n" if project_lines else "")
        + (f"Bio: {c.bio[:200]}\n" if c.bio else "")
    )


def build_screening_prompt(job: Job, candidates: list[ParsedProfile]) -> str:
    w = job.scoring_weights
    req = job.requirements

    candidate_blocks = "\n\n".join(_summarise_candidate(i, c) for i, c in enumerate(candidates))

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

composite_score = (skills_score × {w.skills})
                + (experience_score × {w.experience})
                + (education_score × {w.education})
                + (cultural_fit_score × {w.cultural_fit})

## Scoring rubric
skills:       0 = none of the required skills | 50 = half matched | 100 = all required + extras
              Weight skill level: Expert/Advanced > Intermediate > Beginner
experience:   0 = no relevant experience | 50 = at the minimum threshold | 100 = 2× threshold or more
              Derive total years from role date ranges; favour roles with matching technologies
education:    0 = below requirement | 70 = meets requirement | 100 = exceeds (higher degree / related field)
cultural_fit: infer from bio, headline, side projects, open-source work, and breadth of portfolio

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
