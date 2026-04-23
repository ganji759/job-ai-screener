"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.experienceDurationYears = void 0;
exports.talentProfileToUmuravaProfile = talentProfileToUmuravaProfile;
exports.parseTalentProfile = parseTalentProfile;
exports.safeParseTalentProfile = safeParseTalentProfile;
const node_crypto_1 = require("node:crypto");
const jsonValidator_1 = require("../utils/jsonValidator");
const parseYearMonth = (s) => {
    const [y, m] = s.split("-").map((x) => Number(x));
    return new Date(y, (m || 1) - 1, 1);
};
const endAsDate = (endDate) => {
    if (endDate === "Present")
        return new Date();
    return parseYearMonth(endDate);
};
/** Fractional years between two YYYY-MM bounds (inclusive-ish). */
const experienceDurationYears = (startDate, endDate) => {
    const start = parseYearMonth(startDate).getTime();
    const end = endAsDate(endDate).getTime();
    const ms = Math.max(0, end - start);
    return Math.round((ms / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
};
exports.experienceDurationYears = experienceDurationYears;
/** Maps official Talent Profile → internal UmuravaProfile (CSV/PDF/worker compatibility). */
function talentProfileToUmuravaProfile(tp) {
    const experience = tp.experience.map((e) => {
        const yearsInRole = (0, exports.experienceDurationYears)(e.startDate, e.endDate);
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
    const remotePreference = tp.availability.type === "Full-time"
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
        id: tp.id || (0, node_crypto_1.randomUUID)(),
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
function parseTalentProfile(raw) {
    return jsonValidator_1.ZodTalentProfile.parse(raw);
}
function safeParseTalentProfile(raw) {
    const r = jsonValidator_1.ZodTalentProfile.safeParse(raw);
    return r.success ? r.data : null;
}
