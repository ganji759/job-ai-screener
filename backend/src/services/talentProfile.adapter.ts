import { randomUUID } from "node:crypto";
import type { TalentProfile, UmuravaProfile } from "../types";
import { ZodTalentProfile } from "../utils/jsonValidator";

const parseYearMonth = (s: string): Date => {
  const [y, m] = s.split("-").map((x) => Number(x));
  return new Date(y, (m || 1) - 1, 1);
};

const endAsDate = (endDate: string): Date => {
  if (endDate === "Present") return new Date();
  return parseYearMonth(endDate);
};

/** Fractional years between two YYYY-MM bounds (inclusive-ish). */
export const experienceDurationYears = (startDate: string, endDate: string): number => {
  const start = parseYearMonth(startDate).getTime();
  const end = endAsDate(endDate).getTime();
  const ms = Math.max(0, end - start);
  return Math.round((ms / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
};

/** Maps official Talent Profile → internal UmuravaProfile (CSV/PDF/worker compatibility). */
export function talentProfileToUmuravaProfile(tp: TalentProfile): UmuravaProfile {
  const experience = tp.experience.map((e) => {
    const yearsInRole = experienceDurationYears(e.startDate, e.endDate);
    return {
      company: e.company,
      title: e.role,
      startDate: e.startDate,
      endDate: e.endDate === "Present" ? undefined : e.endDate,
      description: [e.description, e.technologies?.length ? `Tech: ${e.technologies.join(", ")}` : ""].filter(Boolean).join(" · "),
      yearsInRole: Math.max(0.1, yearsInRole),
    };
  });

  const totalYearsExperience = experience.reduce((acc, x) => acc + x.yearsInRole, 0);

  const remotePreference: UmuravaProfile["remotePreference"] =
    tp.availability.type === "Full-time"
      ? "flexible"
      : tp.availability.type === "Part-time"
        ? "hybrid"
        : "remote";

  const certLines = (tp.certifications ?? []).map((c) => {
    const y = Number(String(c.issueDate).slice(0, 4));
    return { name: c.name, issuer: c.issuer, year: Number.isFinite(y) ? y : new Date().getFullYear() };
  });

  const extraSummary = [
    tp.bio,
    tp.projects?.length
      ? `Projects: ${tp.projects.map((p) => `${p.name} (${p.technologies.slice(0, 4).join(", ")})`).join("; ")}`
      : "",
    tp.socialLinks?.linkedin ? `LinkedIn: ${tp.socialLinks.linkedin}` : "",
    tp.socialLinks?.github ? `GitHub: ${tp.socialLinks.github}` : "",
    tp.socialLinks?.portfolio ? `Portfolio: ${tp.socialLinks.portfolio}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    id: tp.id || randomUUID(),
    firstName: tp.firstName,
    lastName: tp.lastName,
    email: tp.email,
    title: tp.headline,
    summary: [tp.bio, extraSummary].filter(Boolean).join("\n\n"),
    skills: tp.skills.map((s) => s.name.trim().toLowerCase()),
    languages: tp.languages.map((l) => ({ name: l.name, level: l.proficiency })),
    experience,
    education: tp.education.map((ed) => ({
      institution: ed.institution,
      degree: ed.degree,
      field: ed.fieldOfStudy,
      graduationYear: ed.endYear,
    })),
    certifications: certLines.length ? certLines : undefined,
    totalYearsExperience: Math.round(totalYearsExperience * 10) / 10,
    location: tp.location,
    remotePreference,
  };
}

export function parseTalentProfile(raw: unknown): TalentProfile {
  return ZodTalentProfile.parse(raw) as TalentProfile;
}

export function safeParseTalentProfile(raw: unknown): TalentProfile | null {
  const r = ZodTalentProfile.safeParse(raw);
  return r.success ? (r.data as TalentProfile) : null;
}
