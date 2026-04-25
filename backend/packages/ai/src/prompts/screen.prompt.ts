import type { Job, ParsedProfile } from "../../../db/src/types";

function summariseCandidate(i: number, c: ParsedProfile): string {
  const skillLines = c.skills
    .slice(0, 8)
    .map((s) => `${s.name} (${s.level}, ${s.yearsOfExperience}yr)`)
    .join(", ");

  const expLines = c.experience
    .slice(0, 4)
    .map((e) => `  - ${e.role} @ ${e.company} (${e.startDate}–${e.endDate}): ${e.description.slice(0, 120)}`)
    .join("\n");

  const eduLines = c.education
    .slice(0, 2)
    .map((e) => `${e.degree} in ${e.fieldOfStudy} @ ${e.institution} (${e.endYear})`)
    .join(" | ");

  const certLines = (c.certifications ?? [])
    .slice(0, 3)
    .map((cert) => `${cert.name} (${cert.issuer})`)
    .join(", ");

  const projectLines = c.projects
    .slice(0, 3)
    .map((p) => `  - ${p.name}: ${p.description.slice(0, 100)} [${p.technologies.slice(0, 4).join(", ")}]`)
    .join("\n");

  return [
    `### Candidate ${i} (index: ${i})`,
    `Name: ${c.firstName} ${c.lastName}`,
    `Headline: ${c.headline}`,
    `Location: ${c.location}`,
    `Availability: ${c.availability.status} · ${c.availability.type}`,
    `Skills: ${skillLines || "none listed"}`,
    `Experience:\n${expLines || "  none listed"}`,
    `Education: ${eduLines || "not specified"}`,
    certLines ? `Certifications: ${certLines}` : "",
    projectLines ? `Projects:\n${projectLines}` : "",
    c.bio ? `Bio: ${c.bio.slice(0, 200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildScreeningPrompt(
  job: Job,
  candidates: ParsedProfile[],
): string {
  const candidateBlocks = candidates
    .map((c, i) => summariseCandidate(i, c))
    .join("\n\n");

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

composite_score = (skills_score × ${job.scoring_weights.skills}) +
                  (experience_score × ${job.scoring_weights.experience}) +
                  (education_score × ${job.scoring_weights.education}) +
                  (cultural_fit_score × ${job.scoring_weights.cultural_fit})

## Scoring rubric
skills:       0=none of the required skills | 50=half matched | 100=all required + extras
              Weight skill level: Expert/Advanced > Intermediate > Beginner
experience:   0=no relevant experience | 50=at minimum threshold | 100=2× threshold or more
              Derive total years from role date ranges; favour roles with matching technologies
education:    0=below requirement | 70=meets requirement | 100=exceeds (higher degree / related field)
cultural_fit: infer from bio, headline, side projects, open-source work, and breadth of portfolio

## Candidates (${candidates.length} total)
${candidateBlocks}

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
