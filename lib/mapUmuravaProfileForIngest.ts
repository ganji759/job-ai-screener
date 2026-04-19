import type {
  UmuravaProfile,
  BackendIngestProfile,
  BackendSkill,
  BackendWorkExperience,
  BackendEducationEntry,
  BackendCertification,
} from "../types";

/** Maps a UI UmuravaProfile to the shape expected by POST /api/jobs/:jobId/applicants. */
export function mapUmuravaProfileForIngest(p: UmuravaProfile): BackendIngestProfile {
  const skills: BackendSkill[] = (p.skills ?? []).map((s) => ({
    name: typeof s === "string" ? s : String(s),
    level: "Intermediate" as const,
    yearsOfExperience: 0,
  }));

  const experience: BackendWorkExperience[] = (p.experience ?? []).map((e) => ({
    company: e.company,
    role: e.title,
    startDate: e.startDate,
    endDate: e.endDate ?? new Date().toISOString().split("T")[0] ?? "",
    description: e.description,
    technologies: [],
    isCurrent: !e.endDate,
  }));

  const education: BackendEducationEntry[] = Array.isArray(p.education)
    ? p.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        fieldOfStudy: e.field,
        startYear: Math.max(1900, (e.graduationYear ?? 2000) - 4),
        endYear: e.graduationYear ?? 2000,
      }))
    : [];

  const certifications: BackendCertification[] = (p.certifications ?? []).map((c) => ({
    name: c.name,
    issuer: c.issuer,
    issueDate: `${String(c.year)}-01-01`,
  }));

  return {
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    headline: p.title ?? "",
    bio: p.bio,
    location: p.location ?? "Unknown",
    skills,
    languages: (p.languages ?? []).map((l) => ({
      name: l.name,
      proficiency: (l.level as BackendIngestProfile["languages"][0]["proficiency"]) ?? "Conversational",
    })),
    experience,
    education,
    certifications,
    projects: [],
    availability: {
      status: "Available" as const,
      type: "Full-time" as const,
      startDate: p.availableFrom,
    },
    socialLinks: {},
  };
}
