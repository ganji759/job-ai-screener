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
