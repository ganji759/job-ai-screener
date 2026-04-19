import type { UmuravaProfile } from "../types";

/** Maps UI JSON profiles to the shape expected by POST /api/v1/applicants/ingest (ZodUmuravaProfile). */
export function mapUmuravaProfileForIngest(p: UmuravaProfile): Record<string, unknown> {
  const id =
    p.id?.trim() ||
    (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const educationArray = Array.isArray(p.education) ? p.education : [];
  return {
    id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: p.phone,
    title: p.title,
    summary: p.summary ?? p.bio ?? (typeof p.education === "string" ? p.education : undefined),
    skills: p.skills ?? [],
    languages: p.languages ?? [],
    experience: p.experience ?? [],
    education: educationArray,
    certifications: p.certifications,
    totalYearsExperience: p.experienceYears ?? p.totalYearsExperience ?? 0,
    availableFrom: p.availableFrom,
    expectedSalary: p.expectedSalary,
    location: p.location ?? "Unknown",
    remotePreference: p.remotePreference ?? "flexible",
  };
}
