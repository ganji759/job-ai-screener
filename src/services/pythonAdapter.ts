/**
 * Type adapters between Node internal types (UmuravaProfile, JobRequirements, CandidateResult)
 * and the Python AI service contract (ParsedProfile, PythonScreeningJob, PythonRankedResult).
 *
 * The Node backend stays in charge of persistence and frontend contract. Python owns the
 * AI work. These adapters are the only translation layer between the two.
 */
import { randomUUID } from "node:crypto";
import type {
  CandidateResult,
  JobRequirements,
  UmuravaProfile,
} from "../types";
import type {
  PythonParsedProfile,
  PythonRankedResult,
  PythonScreeningJob,
} from "./aiClient";

const EDU_LEVEL_LABEL: Record<JobRequirements["educationLevel"], string> = {
  none: "No formal education required",
  certificate: "Certificate or vocational training",
  bachelor: "Bachelor's degree",
  master: "Master's degree",
  phd: "PhD",
};

const LANGUAGE_LEVEL_MAP: Record<string, "Basic" | "Conversational" | "Fluent" | "Native"> = {
  basic: "Basic",
  a1: "Basic",
  a2: "Basic",
  beginner: "Basic",
  conversational: "Conversational",
  intermediate: "Conversational",
  b1: "Conversational",
  b2: "Conversational",
  fluent: "Fluent",
  advanced: "Fluent",
  c1: "Fluent",
  c2: "Fluent",
  native: "Native",
  mother_tongue: "Native",
};

const normaliseLanguageLevel = (level: string | undefined): "Basic" | "Conversational" | "Fluent" | "Native" => {
  if (!level) return "Conversational";
  return LANGUAGE_LEVEL_MAP[level.toLowerCase().trim()] ?? "Conversational";
};

/** UmuravaProfile → Python ParsedProfile (best-effort fill-in for Python-only fields). */
export function umuravaProfileToPython(profile: UmuravaProfile): PythonParsedProfile {
  const yearsPerSkill = profile.totalYearsExperience > 0
    ? Math.min(10, Math.max(1, Math.floor(profile.totalYearsExperience / Math.max(profile.skills.length, 1))))
    : 1;

  return {
    firstName: profile.firstName || "Unknown",
    lastName: profile.lastName || "Candidate",
    email: profile.email || "unknown@example.com",
    headline: profile.title || "Professional",
    bio: profile.summary ?? null,
    location: profile.location || "Unknown",
    skills: profile.skills.map((name) => ({
      name,
      level: "Intermediate" as const,
      yearsOfExperience: yearsPerSkill,
    })),
    languages: (profile.languages ?? []).map((l) => ({
      name: l.name,
      proficiency: normaliseLanguageLevel(l.level),
    })),
    experience: (profile.experience ?? []).map((e) => ({
      company: e.company || "Unknown",
      role: e.title || "Professional",
      startDate: e.startDate || "2020-01",
      endDate: e.endDate || "Present",
      description: e.description || "",
      technologies: [],
      isCurrent: !e.endDate || e.endDate.toLowerCase() === "present",
    })),
    education: (profile.education ?? []).map((e) => ({
      institution: e.institution || "Unknown",
      degree: e.degree || "Bachelor",
      fieldOfStudy: e.field || "General",
      startYear: Math.max(1970, (e.graduationYear || 2020) - 4),
      endYear: e.graduationYear || 2020,
    })),
    certifications: (profile.certifications ?? []).map((c) => ({
      name: c.name,
      issuer: c.issuer,
      issueDate: String(c.year ?? ""),
    })),
    projects: [],
    availability: { status: "Available", type: "Full-time", startDate: profile.availableFrom ?? null },
    socialLinks: null,
  };
}

/** Python ParsedProfile → UmuravaProfile (lossy on skill levels; compute total years from experience). */
export function pythonProfileToUmurava(profile: PythonParsedProfile): UmuravaProfile {
  const totalYears = computeTotalYearsFromPython(profile);
  return {
    id: randomUUID(),
    firstName: profile.firstName || "Unknown",
    lastName: profile.lastName || "Candidate",
    email: profile.email || "unknown@example.com",
    title: profile.headline || "Professional",
    summary: profile.bio ?? undefined,
    location: profile.location || "Unknown",
    skills: Array.from(new Set((profile.skills ?? []).map((s) => s.name.trim().toLowerCase()).filter(Boolean))).slice(0, 50),
    languages: (profile.languages ?? []).map((l) => ({ name: l.name, level: l.proficiency })),
    experience: (profile.experience ?? []).map((e) => {
      const years = yearsBetween(e.startDate, e.endDate);
      return {
        company: e.company,
        title: e.role,
        startDate: e.startDate,
        endDate: e.endDate === "Present" || e.isCurrent ? undefined : e.endDate,
        description: e.description ?? "",
        yearsInRole: Math.max(0, years),
      };
    }),
    education: (profile.education ?? []).map((e) => ({
      institution: e.institution,
      degree: e.degree,
      field: e.fieldOfStudy,
      graduationYear: e.endYear,
    })),
    certifications: (profile.certifications ?? []).map((c) => ({
      name: c.name,
      issuer: c.issuer,
      year: Number.parseInt(c.issueDate, 10) || new Date().getFullYear(),
    })),
    totalYearsExperience: totalYears,
    availableFrom: profile.availability?.startDate ?? undefined,
    remotePreference: "flexible",
  };
}

/** JobRequirements → Python PythonScreeningJob (snake_case, per Python Pydantic schema). */
export function jobRequirementsToPython(
  jobId: string,
  req: JobRequirements,
  weights: { skills: number; experience: number; education: number; cultural_fit: number } = {
    skills: 0.4,
    experience: 0.3,
    education: 0.15,
    cultural_fit: 0.15,
  },
): PythonScreeningJob {
  return {
    _id: jobId,
    title: req.title,
    description: req.description || req.title,
    requirements: {
      skills: req.mustHaveSkills ?? [],
      experience_years: Math.max(0, req.minYearsExperience ?? 0),
      education_level: EDU_LEVEL_LABEL[req.educationLevel] ?? "Bachelor's degree",
      nice_to_have: req.niceToHaveSkills ?? [],
    },
    scoring_weights: weights,
  };
}

/** Python RankedResult[] → Node CandidateResult[] (the frontend already consumes this shape). */
export function pythonResultsToCandidateResults(
  results: PythonRankedResult[],
  job: JobRequirements,
  candidateSkills: Map<string, string[]>,
): CandidateResult[] {
  const mustHave = (job.mustHaveSkills ?? []).map((s) => s.toLowerCase().trim());
  return results.map((r) => {
    const skillsForThisCandidate = (candidateSkills.get(r.applicant_id) ?? []).map((s) => s.toLowerCase().trim());
    const mustHaveSkillsMet = mustHave.filter((s) => skillsForThisCandidate.includes(s));
    const mustHaveSkillsMissing = mustHave.filter((s) => !skillsForThisCandidate.includes(s));
    const confidence = Math.min(100, Math.max(0, Math.round(r.composite_score + (r.strengths.length * 2) - (r.gaps.length * 3))));

    return {
      candidateId: r.applicant_id,
      rank: r.rank,
      totalScore: r.composite_score,
      breakdown: {
        skillsMatch: Math.round(r.dimension_scores.skills),
        experienceMatch: Math.round(r.dimension_scores.experience),
        educationMatch: Math.round(r.dimension_scores.education),
        culturalFit: Math.round(r.dimension_scores.cultural_fit),
      },
      strengths: r.strengths,
      gaps: r.gaps,
      recommendation: r.recommendation,
      mustHaveSkillsMet,
      mustHaveSkillsMissing,
      estimatedOnboardingTime: estimateOnboarding(r.composite_score, mustHaveSkillsMissing.length),
      aiConfidenceScore: confidence,
    };
  });
}

// ---------- helpers ----------

function computeTotalYearsFromPython(profile: PythonParsedProfile): number {
  let total = 0;
  for (const exp of profile.experience ?? []) {
    total += yearsBetween(exp.startDate, exp.endDate);
  }
  if (total > 0) return Math.min(60, Math.round(total));
  const maxSkillYears = (profile.skills ?? []).reduce((acc, s) => Math.max(acc, s.yearsOfExperience ?? 0), 0);
  return Math.min(60, maxSkillYears);
}

function yearsBetween(start: string, end: string): number {
  const parseDate = (s: string): Date | null => {
    if (!s) return null;
    if (s.toLowerCase() === "present") return new Date();
    const d = new Date(s.length === 7 ? `${s}-01` : s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e) return 0;
  const diffMs = e.getTime() - s.getTime();
  return Math.max(0, Math.round((diffMs / (365.25 * 24 * 3600 * 1000)) * 10) / 10);
}

function estimateOnboarding(score: number, missingMustHaves: number): string {
  if (missingMustHaves > 3 || score < 40) return "8+ weeks";
  if (missingMustHaves > 1 || score < 60) return "4-6 weeks";
  if (score < 80) return "2-4 weeks";
  return "1-2 weeks";
}
