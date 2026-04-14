# Umurava AI HR Backend

Umurava AI HR est un backend de screening intelligent pour recruteurs. Il ingère des profils candidats (JSON/PDF/CSV), exécute un scoring multi-critères avec Gemini, puis produit une shortlist exploitable. L'architecture est orientée production avec Fastify, MongoDB, Redis, Bull queue, et export PDF.

## Architecture
Frontend -> Fastify API -> Bull Queue Worker -> Gemini 1.5 Pro
                                  |              |
                                  v              v
                               MongoDB         Redis Cache

## Quick Start
1. `cp .env.example .env`
2. `docker-compose up --build`
3. API: `http://localhost:3001`

## Core Endpoints
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/jobs`
- `POST /api/v1/applicants/upload`
- `POST /api/v1/screenings/run`
- `GET /api/v1/screenings/:id`
- `POST /api/v1/screenings/:id/export`
- `POST /api/v1/screenings/:id/compare`
- `GET /api/v1/dashboard/analytics`

## AI Decision Flow
1. Job decomposition
2. Multi-candidate scoring
3. Top-N shortlist
4. Recruiter-facing reasoning
5. Pool-level insights

## Prompt Engineering & Scoring Logic
- Gemini 1.5 Pro is the mandatory LLM used for: requirement extraction, batch candidate scoring, pool insights, and candidate comparison.
- Prompts are centralized in `src/utils/promptBuilder.ts` for consistency and auditability.
- Candidate scoring is weighted and deterministic:
  - skillsMatch: 40%
  - experienceMatch: 25%
  - educationMatch: 20%
  - culturalFit: 15%
- Even after Gemini returns results, backend recomputes `totalScore` from the breakdown for reliability and fairness.
- All AI outputs are validated by Zod before persistence (`src/utils/jsonValidator.ts`).
- Recruiter-facing explanations enforce:
  - exactly 3 strengths
  - 1-2 actionable gaps/risks
  - concise recommendation text

## Innovation Features
- Async queue-based screening
- AI confidence score per candidate
- Onboarding time estimate
- Talent pool insights
- Head-to-head candidate compare
- Candidate profile enhancement
- Recruiter feedback loop
- Downloadable PDF shortlist report

## Assumptions
- Recruiter owns jobs and can only access owned resources.
- Screening runs over applicants with status `pending`.
- Feedback loop endpoint currently stores minimal placeholder response and can be extended to a dedicated model.
