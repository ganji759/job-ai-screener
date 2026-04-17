// Shared TypeScript types — used by ai/ and api/ packages

export interface ParsedProfile {
  name: string;
  skills: string[];
  experience_years: number;
  education: string;
  summary: string;
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
  source: "umurava_platform" | "upload_csv" | "resume_pdf";
  parsed_profile: ParsedProfile;
};