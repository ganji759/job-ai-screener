import type { Job, ParsedProfile } from "../../../db/src/types";

export function buildScreeningPrompt(
  job: Job,
  candidates: ParsedProfile[],
): string {
  return `You are a senior technical recruiter. Evaluate each candidate strictly and objectively.
Return ONLY a JSON object — no markdown, no explanation, no extra keys.

## Role
Title: ${job.title}
Required skills: ${job.requirements.skills.join(", ")}
Minimum experience: ${job.requirements.experience_years} years
Education requirement: ${job.requirements.education_level}
Nice to have: ${(job.requirements.nice_to_have ?? []).join(", ") || "none"}

## Scoring weights (must reflect in composite_score)
skills: ${job.scoring_weights.skills}
experience: ${job.scoring_weights.experience}
education: ${job.scoring_weights.education}
cultural_fit: ${job.scoring_weights.cultural_fit}

composite_score = (skills_score * ${job.scoring_weights.skills}) +
                  (experience_score * ${job.scoring_weights.experience}) +
                  (education_score * ${job.scoring_weights.education}) +
                  (cultural_fit_score * ${job.scoring_weights.cultural_fit})

## Scoring rubric
skills:       0=none of the required skills | 50=half | 100=all + extras
experience:   0=no experience | 50=at threshold | 100=2x+ threshold
education:    0=below requirement | 70=meets requirement | 100=exceeds
cultural_fit: infer from summary tone, volunteer work, side projects

## Candidates (${candidates.length} total)
${candidates.map((c, i) => `### Candidate ${i} (index: ${i})
${JSON.stringify(c, null, 2)}`).join("\n\n")}

## Required JSON output schema
{
  "evaluations": [
    {
      "candidate_index": <int matching index above>,
      "dimension_scores": {
        "skills": <0-100>,
        "experience": <0-100>,
        "education": <0-100>,
        "cultural_fit": <0-100>
      },
      "composite_score": <0-100 weighted as above>,
      "strengths": [<max 4 concise recruiter-readable strings>],
      "gaps": [<max 3 concise strings, empty array if none>],
      "recommendation": <"Strong hire" | "Consider" | "Reject">
    }
  ]
}`;
}