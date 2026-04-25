/**
 * Official Umurava Talent Profile schema (stored in Applicant.profile when source is umurava_platform).
 * Top-level jobId / source / status live on the Applicant document; profile may omit them.
 */
export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";
export type LanguageProficiency = "Basic" | "Conversational" | "Fluent" | "Native";
export type AvailabilityStatus = "Available" | "Open to Opportunities" | "Not Available";
export type AvailabilityType = "Full-time" | "Part-time" | "Contract";

export interface TalentProfile {
  /** Stable id for screening candidateId matching (required for new platform data). */
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string;
  location: string;
  skills: Array<{
    name: string;
    level: SkillLevel;
    yearsOfExperience: number;
  }>;
  languages: Array<{
    name: string;
    proficiency: LanguageProficiency;
  }>;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    technologies: string[];
    isCurrent: boolean;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: number;
    endYear: number;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    issueDate: string;
  }>;
  projects: Array<{
    name: string;
    description: string;
    technologies: string[];
    role: string;
    link?: string;
    startDate: string;
    endDate: string;
  }>;
  availability: {
    status: AvailabilityStatus;
    type: AvailabilityType;
    startDate?: string;
  };
  socialLinks?: {
    linkedin?: string;
    github?: string;
    portfolio?: string;
  };
}
