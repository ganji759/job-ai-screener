/** POST /api/v1/applicants/ingest — matches backend Zod when mapped via mapUmuravaProfileForIngest. */
export interface UmuravaProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  skills: string[];
  experienceYears?: number;
  education?: string | { institution: string; degree: string; field: string; graduationYear: number }[];
  location?: string;
  bio?: string;
  phone?: string;
  summary?: string;
  languages?: { name: string; level: string }[];
  experience?: {
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    description: string;
    yearsInRole: number;
  }[];
  certifications?: { name: string; issuer: string; year: number }[];
  totalYearsExperience?: number;
  availableFrom?: string;
  expectedSalary?: number;
  remotePreference?: "remote" | "hybrid" | "onsite" | "flexible";
}

export type ExperienceLevel = "junior" | "mid" | "senior";

/** Stored on Job documents (API requirements object). */
export interface JobRequirements {
  domain: string;
  experienceLevel: ExperienceLevel;
  minExperienceYears: number;
  skills: string[];
  education?: string;
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

/** Embedded profile when backend attaches rich shortlist rows */
export interface ScreeningShortlistProfile {
  firstName: string;
  lastName: string;
  title: string;
  skills: string[];
  experienceYears: number;
  education: string;
}

/** Stored on Screening.results.shortlist — extends scoring output with optional alias ids */
export interface ScreeningShortlistEntry extends CandidateResult {
  applicantId?: string;
  skillsScore?: number;
  experienceScore?: number;
  educationScore?: number;
  profile?: ScreeningShortlistProfile;
}

/** Payload stored on Screening.results by the worker */
export interface ScreeningResultsPayload {
  screeningId?: string;
  jobId?: string;
  status?: string;
  shortlistSize?: number;
  shortlist: ScreeningShortlistEntry[];
  totalAnalyzed: number;
  averageScore: number;
  scoreDistribution?: { range: string; count: number }[];
  topSkillsFound: string[];
  skillGapsInPool: string[];
  durationMs?: number;
  createdAt?: Date | string;
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
  avatarUrl?: string | null;
  createdAt?: string;
}

export interface Job {
  _id: string;
  title: string;
  description: string;
  requirements: JobRequirements;
  location: string;
  employmentType: "full_time" | "part_time" | "contract" | "remote";
  recruiterId: string;
  status: "draft" | "active" | "closed";
  applicantCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Stored profile from API (normalized); may include extra fields from Mongo. */
export interface ApplicantProfile {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  title: string;
  skills: string[];
  experienceYears?: number;
  education?: string | { institution: string; degree: string; field: string; graduationYear: number }[];
  location?: string;
  bio?: string;
  phone?: string;
  totalYearsExperience?: number;
}

export interface Applicant {
  _id: string;
  jobId: string;
  source: "umurava_platform" | "csv_upload" | "pdf_upload";
  profile: ApplicantProfile;
  rawText?: string;
  originalFileName?: string;
  status: "pending" | "screened" | "shortlisted" | "rejected";
  screeningId?: string;
  totalScore?: number;
  createdAt: string;
}

export interface Screening {
  _id: string;
  jobId: string;
  recruiterId: string;
  /** Raw document from API: queued | running | completed | failed */
  status: "queued" | "running" | "completed" | "failed";
  shortlistSize: 10 | 20;
  /** Worker payload; same shape as ScreeningResultsPayload */
  results?: ScreeningResultsPayload;
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
  metadata?: { jobId?: string; screeningId?: string; [key: string]: unknown };
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
