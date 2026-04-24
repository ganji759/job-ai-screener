export type {
  AvailabilityStatus,
  AvailabilityType,
  LanguageProficiency,
  SkillLevel,
  TalentProfile,
} from "./talentProfile";

export interface UmuravaProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title: string;
  summary?: string;
  skills: string[];
  languages: { name: string; level: string }[];
  experience: {
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    description: string;
    yearsInRole: number;
  }[];
  education: {
    institution: string;
    degree: string;
    field: string;
    graduationYear: number;
  }[];
  certifications?: { name: string; issuer: string; year: number }[];
  totalYearsExperience: number;
  availableFrom?: string;
  expectedSalary?: number;
  location: string;
  remotePreference: "remote" | "hybrid" | "onsite" | "flexible";
  /** Optional richer fields populated by the Python AI service (POST /normalise/pdf). */
  headline?: string;
  bio?: string;
  projects?: {
    name: string;
    description: string;
    technologies?: string[];
    role?: string;
    link?: string | null;
    startDate?: string;
    endDate?: string;
  }[];
  availability?: {
    status: "Available" | "Open to Opportunities" | "Not Available";
    type: "Full-time" | "Part-time" | "Contract";
    startDate?: string | null;
  };
  socialLinks?: { linkedin?: string | null; github?: string | null; portfolio?: string | null };
}

export interface JobRequirements {
  title: string;
  description: string;
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  minYearsExperience: number;
  educationLevel: "none" | "certificate" | "bachelor" | "master" | "phd";
  domain: string;
  location?: string;
  remoteAllowed: boolean;
  salaryRange?: { min: number; max: number; currency: string };
  softSkills?: string[];
}

export interface ScoringBreakdown {
  skillsMatch: number;
  experienceMatch: number;
  educationMatch: number;
  culturalFit: number;
}

/** Scenario 1 — Umurava platform rubric (points sum to 100). */
export interface PlatformScoringBreakdown {
  /** 0–35 */
  skillsMatch: number;
  /** 0–25 */
  experience: number;
  /** 0–15 */
  education: number;
  /** 0–15 */
  roleRelevance: number;
  /** 0–10 */
  additionalAssets: number;
}

export interface PlatformReasoning {
  strengths: string[];
  gaps: string[];
  relevanceSummary: string;
  recommendation: string;
  hiringRisk: "Low" | "Medium" | "High";
}

export interface PlatformCandidateResult {
  candidateId: string;
  rank: number;
  totalScore: number;
  scoreBreakdown: PlatformScoringBreakdown;
  reasoning: PlatformReasoning;
  mustHaveSkillsMet: string[];
  mustHaveSkillsMissing: string[];
  estimatedOnboardingTime: string;
  aiConfidenceScore: number;
}

export interface CandidateResult {
  candidateId: string;
  rank: number;
  totalScore: number;
  breakdown: ScoringBreakdown;
  strengths: string[];
  gaps: string[];
  recommendation: string;
  mustHaveSkillsMet: string[];
  mustHaveSkillsMissing: string[];
  estimatedOnboardingTime: string;
  aiConfidenceScore: number;
}

export interface ScreeningResult {
  screeningId: string;
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  shortlistSize: number;
  shortlist: CandidateResult[];
  totalAnalyzed: number;
  averageScore: number;
  scoreDistribution: {
    range: string;
    count: number;
  }[];
  topSkillsFound: string[];
  skillGapsInPool: string[];
  durationMs: number;
  createdAt: Date;
}

export interface PoolInsights {
  scoreDistribution: { range: string; count: number }[];
  topSkillsFound: string[];
  skillGapsInPool: string[];
  recruitingRecommendation: string;
  averageScore: number;
}
