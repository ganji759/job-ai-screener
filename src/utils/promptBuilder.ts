import type { CandidateResult, JobRequirements, UmuravaProfile } from "../types";

export const buildExtractRequirementsPrompt = (rawDescription: string): string => `
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

export const buildScoreCandidatesPrompt = (
  job: JobRequirements,
  batch: UmuravaProfile[],
): string => `
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

export const buildPoolInsightsPrompt = (
  job: JobRequirements,
  allResults: CandidateResult[],
): string => `
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

export const buildResumeExtractionPrompt = (rawText: string): string => `
Extract the following fields from this resume text and return ONLY valid JSON matching UmuravaProfile schema.
Resume text:
${rawText}
`;

export const buildCompareCandidatesPrompt = (
  candidates: CandidateResult[],
): string => `
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

export const buildBenchmarkPrompt = (
  job: JobRequirements,
  candidates: UmuravaProfile[],
): string => `
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

export const buildEnhanceProfilePrompt = (profile: unknown): string => `
You are an expert recruiter. Improve this sparse profile using only realistic inferences.
Return JSON only, maintaining same keys.
Profile:
${JSON.stringify(profile, null, 2)}
`;
