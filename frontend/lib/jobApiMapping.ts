import type { ApiEducationLevel, ApiJob, ApiJobRequirements, ExperienceLevel, Job } from "../types";

type JobStatus = Job["status"];

/** Maps free-text education (UI) → API enum (matches backend JobRequirementsSchema). */
export function mapEducationStringToLevel(value: string): ApiEducationLevel {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return "none";
  if (normalized.includes("phd") || normalized.includes("doctor")) return "phd";
  if (normalized.includes("master")) return "master";
  if (normalized.includes("bachelor")) return "bachelor";
  if (normalized.includes("certificate") || normalized.includes("certif")) return "certificate";
  return "none";
}

function educationLevelToDisplay(level: ApiEducationLevel | undefined): string {
  const map: Record<ApiEducationLevel, string> = {
    none: "",
    certificate: "Certificate",
    bachelor: "Bachelor's degree",
    master: "Master's degree",
    phd: "PhD / Doctorate",
  };
  return map[level ?? "none"] ?? "";
}

/** Heuristic: years → UI band (not stored on API). */
export function minYearsToExperienceLevel(years: number): ExperienceLevel {
  if (years <= 2) return "junior";
  if (years >= 6) return "senior";
  return "mid";
}

export function employmentTypeFromRemote(remoteAllowed: boolean | undefined): Job["employmentType"] {
  return remoteAllowed ? "remote" : "full_time";
}

/** Normalizes Mongo `_id` / dates from API JSON. */
export function adaptApiJobToJob(raw: ApiJob): Job {
  // Lean updates (e.g. `PUT` with only `status: "closed"`) still return a full job; be defensive
  // in case of legacy or partial documents so the UI does not throw in transformResponse.
  const req: Partial<ApiJobRequirements> = raw?.requirements ?? {};
  const educationLevel = req.educationLevel ?? "none";
  const minYears = req.minYearsExperience ?? 0;

  return {
    _id: String(raw?._id ?? ""),
    title: String(raw?.title ?? ""),
    description: String(raw?.description ?? ""),
    requirements: {
      requirementsTitle: req.title != null && String(req.title).trim() !== "" ? String(req.title) : "Requirements",
      requirementsDescription:
        req.description != null && String(req.description).trim() !== "" ? String(req.description) : "—",
      domain: req.domain ?? "general",
      experienceLevel: minYearsToExperienceLevel(minYears),
      minExperienceYears: minYears,
      skills: req.mustHaveSkills ?? [],
      education: educationLevelToDisplay(educationLevel),
    },
    location: req.location ?? "",
    employmentType: employmentTypeFromRemote(req.remoteAllowed),
    recruiterId: raw.recruiterId ? String(raw.recruiterId) : "",
    status: raw.status ?? "draft",
    applicantCount: raw.applicantCount ?? 0,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  };
}

export type JobEditDraft = {
  title: string;
  description: string;
  requirementsTitle: string;
  requirementsDescription: string;
  domain: string;
  location: string;
  employmentType: Job["employmentType"];
  experienceLevel: ExperienceLevel;
  minExperienceYears: number;
  education: string;
  skills: string[];
};

export function jobToEditDraft(job: Job): JobEditDraft {
  return {
    title: job.title,
    description: job.description,
    requirementsTitle: job.requirements.requirementsTitle,
    requirementsDescription: job.requirements.requirementsDescription,
    domain: job.requirements.domain,
    location: job.location,
    employmentType: job.employmentType,
    experienceLevel: job.requirements.experienceLevel,
    minExperienceYears: job.requirements.minExperienceYears,
    education: job.requirements.education ?? "",
    skills: [...(job.requirements.skills ?? [])],
  };
}

function draftsEqual(a: JobEditDraft, b: JobEditDraft): boolean {
  return (
    a.title === b.title &&
    a.description === b.description &&
    a.requirementsTitle === b.requirementsTitle &&
    a.requirementsDescription === b.requirementsDescription &&
    a.domain === b.domain &&
    a.location === b.location &&
    a.employmentType === b.employmentType &&
    a.minExperienceYears === b.minExperienceYears &&
    a.education === b.education &&
    a.skills.length === b.skills.length &&
    a.skills.every((s, i) => s === b.skills[i])
  );
}

export type UpdateJobBody = {
  title?: string;
  description?: string;
  status?: JobStatus;
  requirements?: ApiJobRequirements;
};

/** Builds a PUT body from the edit form; returns null if nothing changed vs. original draft snapshot. */
export function buildUpdateJobBody(original: JobEditDraft, current: JobEditDraft): UpdateJobBody | null {
  if (draftsEqual(original, current)) return null;

  const requirements: ApiJobRequirements = {
    title: current.requirementsTitle.trim(),
    description: current.requirementsDescription.trim(),
    mustHaveSkills: current.skills,
    niceToHaveSkills: [],
    minYearsExperience: current.minExperienceYears,
    educationLevel: mapEducationStringToLevel(current.education),
    domain: current.domain.trim() || "general",
    location: current.location.trim() || undefined,
    remoteAllowed: current.employmentType === "remote",
  };

  const body: UpdateJobBody = { requirements };

  if (current.title.trim() !== original.title.trim()) body.title = current.title.trim();
  if (current.description.trim() !== original.description.trim()) body.description = current.description.trim();

  return body;
}
