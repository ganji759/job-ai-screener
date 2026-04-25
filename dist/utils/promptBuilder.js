"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEnhanceProfilePrompt = exports.buildBenchmarkPrompt = exports.buildCompareCandidatesPrompt = exports.buildResumeExtractionPrompt = exports.buildPoolInsightsPrompt = exports.buildUmuravaPlatformScoreCandidatesPrompt = exports.buildScoreCandidatesPrompt = exports.buildExtractRequirementsPrompt = void 0;
exports.compressTalentProfileForScoring = compressTalentProfileForScoring;
const buildExtractRequirementsPrompt = (rawDescription) => `
You are a senior HR analyst. Parse this job description and extract structured
requirements. Return ONLY valid JSON with no markdown, no explanation, matching
this exact schema:
{
  mustHaveSkills: string[],
  niceToHaveSkills: string[],
  minYearsExperience: number,
  educationLevel: string,
  domain: string,
  remoteAllowed: boolean,
  softSkills: string[]
}
Job Description: ${rawDescription}
`;
exports.buildExtractRequirementsPrompt = buildExtractRequirementsPrompt;
const buildScoreCandidatesPrompt = (job, batch) => `
You are a senior HR analyst conducting a talent screening.
Evaluate ALL candidates against the job requirements below.
Be SPECIFIC — reference actual data from each candidate profile.
Output ONLY a valid JSON array. No markdown, no explanation outside JSON.

JOB REQUIREMENTS:
${JSON.stringify(job, null, 2)}

CANDIDATES (${batch.length} total):
${JSON.stringify(batch, null, 2)}

Use this EXACT weighted rubric:
- skillsMatch (40%)
- experienceMatch (25%)
- educationMatch (20%)
- culturalFit (15%)

Also compute:
- mustHaveSkillsMet
- mustHaveSkillsMissing
- estimatedOnboardingTime
- aiConfidenceScore

Critical quality rules:
- strengths must be exactly 3 bullet-style strings with concrete facts (skills, years, companies)
- gaps must be 1-2 actionable risks (missing must-have skill, weak domain evidence, etc.)
- recommendation must be 2-3 recruiter-friendly sentences and include candidate name
- scores must be in [0,100]
- totalScore must reflect weighted average of breakdown

Return JSON array sorted by totalScore DESC with:
candidateId,totalScore,breakdown,strengths[3],gaps[1-2],recommendation,mustHaveSkillsMet,mustHaveSkillsMissing,estimatedOnboardingTime,aiConfidenceScore
`;
exports.buildScoreCandidatesPrompt = buildScoreCandidatesPrompt;
/** Compact profile for Gemini to avoid huge prompts / timeouts (full data remains in DB). */
function compressTalentProfileForScoring(p) {
    const skills = (p.skills ?? [])
        .map((s) => `${s.name}(${s.level},${s.yearsOfExperience}yrs)`)
        .join(", ");
    const experience = (p.experience ?? [])
        .map((e) => `${e.role} at ${e.company} (${e.startDate}–${e.endDate}) — ${(e.technologies ?? []).join(",")}`)
        .join(" | ");
    const education = (p.education ?? []).map((e) => `${e.degree} ${e.fieldOfStudy}`).join(", ");
    const projectsPreview = (p.projects ?? []).slice(0, 2).map((pr) => `${pr.name}: ${pr.technologies.join(",")}`);
    return {
        id: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
        headline: p.headline,
        bio: p.bio ? `${p.bio.slice(0, 320)}${p.bio.length > 320 ? "…" : ""}` : undefined,
        skills,
        experience,
        education,
        projectsCount: (p.projects ?? []).length,
        projectsPreview,
        certificationsCount: (p.certifications ?? []).length,
        availability: p.availability?.status,
        linkedin: p.socialLinks?.linkedin,
        github: p.socialLinks?.github,
    };
}
/** Scenario 1 — Umurava platform: compressed summaries + fixed point caps (sum = totalScore 0–100). */
const buildUmuravaPlatformScoreCandidatesPrompt = (job, batch) => {
    const compressed = batch.map(compressTalentProfileForScoring);
    return `
You are a senior technical recruiter screening Umurava Talent Platform candidates.
Each candidate below is a COMPRESSED summary derived from the full Talent Profile (skills levels/years are inlined in "skills"; experience stacks in "experience"; project breadth via counts + short preview).

Use this EXACT scoring rubric — points MUST stay within caps:
- scoreBreakdown.skillsMatch (0–35): Parse skill tiers from the compressed "skills" string (Level,years); compare to job must-have / nice-to-have skills.
- scoreBreakdown.experience (0–25): Use "experience" lines (roles, dates, technologies).
- scoreBreakdown.education (0–15): Use "education" string.
- scoreBreakdown.roleRelevance (0–15): headline, bio snippet, projectsPreview vs job title/domain.
- scoreBreakdown.additionalAssets (0–10): certificationsCount, linkedin/github, projectsCount/link signals.

totalScore MUST equal the sum of the five scoreBreakdown fields (max 100).

For EACH output row, set candidateId to the candidate object "id" field EXACTLY (string match).

For each candidate output:
- reasoning.strengths: 3–5 concise bullets with concrete facts
- reasoning.gaps: 2–4 actionable risks or gaps
- reasoning.relevanceSummary: 2–4 sentences on fit for THIS role
- reasoning.recommendation: 2–3 recruiter-facing sentences (include candidate name)
- reasoning.hiringRisk: exactly one of "Low", "Medium", "High"

Also output mustHaveSkillsMet, mustHaveSkillsMissing, estimatedOnboardingTime, aiConfidenceScore (0–100).

Return ONLY a valid JSON array (no markdown fences). Order candidates in this batch by totalScore descending.

JOB REQUIREMENTS:
${JSON.stringify(job, null, 2)}

CANDIDATES (${batch.length}) — compressed summaries (JSON):
${JSON.stringify(compressed, null, 2)}
`;
};
exports.buildUmuravaPlatformScoreCandidatesPrompt = buildUmuravaPlatformScoreCandidatesPrompt;
const buildPoolInsightsPrompt = (job, allResults) => `
Analyze this recruitment pool and return JSON only with:
scoreDistribution (0-20,21-40,41-60,61-80,81-100),
topSkillsFound,
skillGapsInPool,
recruitingRecommendation,
averageScore.

JOB:
${JSON.stringify(job, null, 2)}

RESULTS:
${JSON.stringify(allResults, null, 2)}
`;
exports.buildPoolInsightsPrompt = buildPoolInsightsPrompt;
const buildResumeExtractionPrompt = (rawText) => `
You extract structured candidate data from resume text for an ATS. Return ONLY valid JSON, no markdown fences.
Use null or omit optional fields when unknown.

Schema (all keys optional except follow best effort):
{
  "firstName": string?,
  "lastName": string?,
  "fullName": string?,
  "email": string?,
  "phone": string?,
  "title": string (current target role or headline)?,
  "summary": string (2-4 sentences)?,
  "skills": string[] (technical and professional skills, lowercase ok),
  "languages": [{ "name": string, "level": string }]?,
  "experience": [{ "company": string, "title": string, "startDate": string, "endDate": string?, "description": string, "yearsInRole": number }]?,
  "education": [{ "institution": string, "degree": string, "field": string, "graduationYear": number }]?,
  "totalYearsExperience": number?,
  "location": string?
}

Resume text:
${rawText.slice(0, 120000)}
`;
exports.buildResumeExtractionPrompt = buildResumeExtractionPrompt;
const buildCompareCandidatesPrompt = (candidates) => `
Compare candidates head-to-head and return JSON only:
{
  winner: "candidateId",
  comparisonTable: [{
    candidateId: string,
    skillsMatch: number,
    experienceMatch: number,
    educationMatch: number,
    culturalFit: number,
    totalScore: number
  }],
  narrative: string
}

Candidates:
${JSON.stringify(candidates, null, 2)}
`;
exports.buildCompareCandidatesPrompt = buildCompareCandidatesPrompt;
const buildBenchmarkPrompt = (job, candidates) => `
You are an HR market analyst.
Compare this applicant pool to realistic industry trends and return JSON only:
{
  poolStrengthScore: number,
  hardestSkillsToFind: string[],
  recommendedSalaryRange: string,
  timeToFillEstimate: string
}

JOB:
${JSON.stringify(job, null, 2)}

POOL SAMPLE:
${JSON.stringify(candidates.slice(0, 30), null, 2)}
`;
exports.buildBenchmarkPrompt = buildBenchmarkPrompt;
const buildEnhanceProfilePrompt = (profile) => `
You are an expert recruiter. Improve this sparse profile using only realistic inferences.
Return JSON only, maintaining same keys.
Profile:
${JSON.stringify(profile, null, 2)}
`;
exports.buildEnhanceProfilePrompt = buildEnhanceProfilePrompt;
