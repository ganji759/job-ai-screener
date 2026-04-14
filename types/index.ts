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
  scoreDistribution: { range: string; count: number }[];
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

export interface User {
  id: string;
  name: string;
  email: string;
  role: "recruiter" | "admin";
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  requirements: JobRequirements;
  recruiterId: string;
  status: "draft" | "active" | "closed";
  applicantCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Applicant {
  _id: string;
  jobId: string;
  source: "umurava_platform" | "csv_upload" | "pdf_upload";
  profile: UmuravaProfile;
  rawText?: string;
  originalFileName?: string;
  status: "pending" | "screened" | "shortlisted" | "rejected";
  screeningId?: string;
  createdAt: string;
}

export interface Screening {
  _id: string;
  jobId: string;
  recruiterId: string;
  status: "queued" | "running" | "completed" | "failed";
  shortlistSize: 10 | 20;
  results?: ScreeningResult;
  errorMessage?: string;
  queueJobId?: string;
  durationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  channel: "in_app" | "email" | "system";
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UploadPreview {
  profile: Partial<UmuravaProfile>;
  fileName: string;
  status: "valid" | "invalid";
  errors?: string[];
}
