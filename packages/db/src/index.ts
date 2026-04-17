// @umurava/db — MongoDB schemas and connection

export { connectDB } from "./connect";

// Export all models
export { JobModel } from "./models/job.model";
export { ApplicantModel } from "./models/applicant.model";
export { ScreeningRunModel } from "./models/screening-run.model";
export { ScreeningResultModel } from "./models/screening-result.model";
export type { IJob as Job } from "./models/job.model";
export type { IApplicant as Applicant } from "./models/applicant.model";
export type { IScreeningRun as ScreeningRun } from "./models/screening-run.model";
export type { IScreeningResult as ScreeningResult } from "./models/screening-result.model";

// Export shared types
export type {
  ParsedProfile,
  ScoringWeights,
  JobRequirements,
  Job,
  Applicant,
} from "./types";