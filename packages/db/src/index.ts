// @umurava/db — MongoDB schemas and connection

export { connectDB } from "./connect";

// Export all models
export { JobModel } from "./models/job.model";
export { ApplicantModel } from "./models/applicant.model";
export { ScreeningRunModel } from "./models/screening-run.model";
export { ScreeningResultModel } from "./models/screening-result.model";

// Export model document interfaces (Mongoose Document types)
export type { IJob } from "./models/job.model";
export type { IApplicant } from "./models/applicant.model";
export type { IScreeningRun } from "./models/screening-run.model";
export type { IScreeningResult } from "./models/screening-result.model";

// Export lean plain-object types (safe for cross-service use and lean() results)
export type {
  ParsedProfile,
  ScoringWeights,
  JobRequirements,
  Job,
  Applicant,
} from "./types";
