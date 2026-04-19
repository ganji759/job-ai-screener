// Shared TypeScript types — used by ai/ and api/ packages

export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
export type LanguageProficiency = 'Basic' | 'Conversational' | 'Fluent' | 'Native';
export type AvailabilityStatus = 'Available' | 'Open to Opportunities' | 'Not Available';
export type EngagementType = 'Full-time' | 'Part-time' | 'Contract';

export interface Skill {
  name: string;
  level: SkillLevel;
  yearsOfExperience: number;
}

export interface Language {
  name: string;
  proficiency: LanguageProficiency;
}

export interface WorkExperience {
  company: string;
  role: string;
  startDate: string;   // YYYY-MM
  endDate: string;     // YYYY-MM | "Present"
  description: string;
  technologies: string[];
  isCurrent: boolean;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear: number;
  endYear: number;
}

export interface Certification {
  name: string;
  issuer: string;
  issueDate: string;   // YYYY-MM
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  role: string;
  link?: string;
  startDate: string;   // YYYY-MM
  endDate: string;     // YYYY-MM
}

export interface Availability {
  status: AvailabilityStatus;
  type: EngagementType;
  startDate?: string;  // YYYY-MM-DD
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  [key: string]: string | undefined;
}

export interface ParsedProfile {
  firstName: string;
  lastName: string;
  email: string;
  headline: string;
  bio?: string;
  location: string;
  skills: Skill[];
  languages?: Language[];
  experience: WorkExperience[];
  education: EducationEntry[];
  certifications?: Certification[];
  projects: Project[];
  availability: Availability;
  socialLinks?: SocialLinks;
}

export interface ScoringWeights {
  skills: number;
  experience: number;
  education: number;
  cultural_fit: number;
}

export interface JobRequirements {
  skills: string[];
  experience_years: number;
  education_level: string;
  nice_to_have: string[];
}

// Lean versions for passing between services (no Mongoose document methods)
export type Job = {
  _id: string;
  title: string;
  description: string;
  requirements: JobRequirements;
  scoring_weights: ScoringWeights;
  is_deleted?: boolean;
  deleted_at?: string;
};

export type Applicant = {
  _id: string;
  job_id: string;
  source: 'umurava_platform' | 'upload_csv' | 'resume_pdf';
  parsed_profile: ParsedProfile;
};
