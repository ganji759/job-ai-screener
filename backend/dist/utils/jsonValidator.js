"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWithSchema = exports.ZodPlatformCandidateResultArray = exports.ZodPlatformCandidateResult = exports.ZodPlatformReasoning = exports.ZodPlatformScoringBreakdown = exports.ZodPoolInsights = exports.ZodTalentProfile = exports.ZodTalentPlatformProfile = exports.ZodResumeGeminiExtraction = exports.ZodCandidateResultArray = exports.ZodCandidateResult = exports.ZodScoringBreakdown = exports.ZodJobRequirements = exports.ZodUmuravaProfile = void 0;
const zod_1 = require("zod");
exports.ZodUmuravaProfile = zod_1.z.object({
    id: zod_1.z.string(),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().optional(),
    title: zod_1.z.string(),
    summary: zod_1.z.string().optional(),
    skills: zod_1.z.array(zod_1.z.string()),
    languages: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), level: zod_1.z.string() })),
    experience: zod_1.z.array(zod_1.z.object({
        company: zod_1.z.string(),
        title: zod_1.z.string(),
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string().optional(),
        description: zod_1.z.string(),
        yearsInRole: zod_1.z.number(),
    })),
    education: zod_1.z.array(zod_1.z.object({
        institution: zod_1.z.string(),
        degree: zod_1.z.string(),
        field: zod_1.z.string(),
        graduationYear: zod_1.z.number().int(),
    })),
    certifications: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), issuer: zod_1.z.string(), year: zod_1.z.number().int() })).optional(),
    totalYearsExperience: zod_1.z.number(),
    availableFrom: zod_1.z.string().optional(),
    expectedSalary: zod_1.z.number().optional(),
    location: zod_1.z.string(),
    remotePreference: zod_1.z.enum(["remote", "hybrid", "onsite", "flexible"]),
});
exports.ZodJobRequirements = zod_1.z.object({
    title: zod_1.z.string().optional().default("Untitled Role"),
    description: zod_1.z.string().optional().default(""),
    mustHaveSkills: zod_1.z.array(zod_1.z.string()).default([]),
    niceToHaveSkills: zod_1.z.array(zod_1.z.string()).default([]),
    minYearsExperience: zod_1.z.number().min(0).default(0),
    educationLevel: zod_1.z.enum(["none", "certificate", "bachelor", "master", "phd"]),
    domain: zod_1.z.string().default("general"),
    location: zod_1.z.string().optional(),
    remoteAllowed: zod_1.z.boolean().default(false),
    salaryRange: zod_1.z
        .object({
        min: zod_1.z.number().int().nonnegative(),
        max: zod_1.z.number().int().nonnegative(),
        currency: zod_1.z.string(),
    })
        .optional(),
    softSkills: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ZodScoringBreakdown = zod_1.z.object({
    skillsMatch: zod_1.z.number().min(0).max(100),
    experienceMatch: zod_1.z.number().min(0).max(100),
    educationMatch: zod_1.z.number().min(0).max(100),
    culturalFit: zod_1.z.number().min(0).max(100),
});
exports.ZodCandidateResult = zod_1.z.object({
    candidateId: zod_1.z.string(),
    rank: zod_1.z.number().int().optional().default(0),
    totalScore: zod_1.z.number().min(0).max(100),
    breakdown: exports.ZodScoringBreakdown,
    strengths: zod_1.z.array(zod_1.z.string()).min(3).max(3),
    gaps: zod_1.z.array(zod_1.z.string()).min(1).max(2),
    recommendation: zod_1.z.string(),
    mustHaveSkillsMet: zod_1.z.array(zod_1.z.string()),
    mustHaveSkillsMissing: zod_1.z.array(zod_1.z.string()),
    estimatedOnboardingTime: zod_1.z.string(),
    aiConfidenceScore: zod_1.z.number().min(0).max(100),
});
exports.ZodCandidateResultArray = zod_1.z.array(exports.ZodCandidateResult);
/** Loose resume fields from Gemini (PDF / unstructured) — merged with heuristics before `normalizeProfile`. */
exports.ZodResumeGeminiExtraction = zod_1.z
    .object({
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    fullName: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    skills: zod_1.z.array(zod_1.z.string()).optional(),
    languages: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string(), level: zod_1.z.string() })).optional(),
    experience: zod_1.z
        .array(zod_1.z.object({
        company: zod_1.z.string(),
        title: zod_1.z.string(),
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string().optional(),
        description: zod_1.z.string(),
        yearsInRole: zod_1.z.number(),
    }))
        .optional(),
    education: zod_1.z
        .array(zod_1.z.object({
        institution: zod_1.z.string(),
        degree: zod_1.z.string(),
        field: zod_1.z.string(),
        graduationYear: zod_1.z.number(),
    }))
        .optional(),
    totalYearsExperience: zod_1.z.number().optional(),
    location: zod_1.z.string().optional(),
})
    .passthrough();
/** Scenario 1 — Umurava Talent Profile Schema (structured platform ingest). */
exports.ZodTalentPlatformProfile = zod_1.z
    .object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string(),
    skills: zod_1.z.array(zod_1.z.string()),
    experience_years: zod_1.z.coerce.number(),
    education: zod_1.z.string(),
    previous_roles: zod_1.z.array(zod_1.z.string()),
    portfolio_url: zod_1.z.union([zod_1.z.string().url(), zod_1.z.literal("")]).optional(),
    github_url: zod_1.z.union([zod_1.z.string().url(), zod_1.z.literal("")]).optional(),
    location: zod_1.z.string(),
})
    .strip();
/** Official Umurava Talent Profile (Applicant.profile when source = umurava_platform). */
exports.ZodTalentProfile = zod_1.z.object({
    id: zod_1.z.string().min(1),
    firstName: zod_1.z.string(),
    lastName: zod_1.z.string(),
    email: zod_1.z.string().email(),
    headline: zod_1.z.string(),
    bio: zod_1.z.string().optional(),
    location: zod_1.z.string(),
    skills: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        level: zod_1.z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]),
        yearsOfExperience: zod_1.z.number().nonnegative(),
    })),
    languages: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        proficiency: zod_1.z.enum(["Basic", "Conversational", "Fluent", "Native"]),
    })),
    experience: zod_1.z.array(zod_1.z.object({
        company: zod_1.z.string(),
        role: zod_1.z.string(),
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
        description: zod_1.z.string(),
        technologies: zod_1.z.array(zod_1.z.string()),
        isCurrent: zod_1.z.boolean(),
    })),
    education: zod_1.z.array(zod_1.z.object({
        institution: zod_1.z.string(),
        degree: zod_1.z.string(),
        fieldOfStudy: zod_1.z.string(),
        startYear: zod_1.z.number(),
        endYear: zod_1.z.number(),
    })),
    certifications: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string(),
        issuer: zod_1.z.string(),
        issueDate: zod_1.z.string(),
    }))
        .optional(),
    projects: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string(),
        technologies: zod_1.z.array(zod_1.z.string()),
        role: zod_1.z.string(),
        link: zod_1.z.string().optional(),
        startDate: zod_1.z.string(),
        endDate: zod_1.z.string(),
    })),
    availability: zod_1.z.object({
        status: zod_1.z.enum(["Available", "Open to Opportunities", "Not Available"]),
        type: zod_1.z.enum(["Full-time", "Part-time", "Contract"]),
        startDate: zod_1.z.string().optional(),
    }),
    socialLinks: zod_1.z
        .object({
        linkedin: zod_1.z.string().optional(),
        github: zod_1.z.string().optional(),
        portfolio: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.ZodPoolInsights = zod_1.z.object({
    scoreDistribution: zod_1.z.array(zod_1.z.object({ range: zod_1.z.string(), count: zod_1.z.number().int() })),
    topSkillsFound: zod_1.z.array(zod_1.z.string()),
    skillGapsInPool: zod_1.z.array(zod_1.z.string()),
    recruitingRecommendation: zod_1.z.string(),
    averageScore: zod_1.z.number().min(0).max(100),
});
/** Scenario 1 — Umurava platform AI screening (35 / 25 / 15 / 15 / 10 point rubric). */
exports.ZodPlatformScoringBreakdown = zod_1.z.object({
    skillsMatch: zod_1.z.number().min(0).max(35),
    experience: zod_1.z.number().min(0).max(25),
    education: zod_1.z.number().min(0).max(15),
    roleRelevance: zod_1.z.number().min(0).max(15),
    additionalAssets: zod_1.z.number().min(0).max(10),
});
exports.ZodPlatformReasoning = zod_1.z.object({
    strengths: zod_1.z.array(zod_1.z.string()).min(1).max(6),
    gaps: zod_1.z.array(zod_1.z.string()).min(1).max(5),
    relevanceSummary: zod_1.z.string(),
    recommendation: zod_1.z.string(),
    hiringRisk: zod_1.z.enum(["Low", "Medium", "High"]),
});
exports.ZodPlatformCandidateResult = zod_1.z.object({
    candidateId: zod_1.z.string(),
    rank: zod_1.z.number().int().optional().default(0),
    totalScore: zod_1.z.number().min(0).max(100),
    scoreBreakdown: exports.ZodPlatformScoringBreakdown,
    reasoning: exports.ZodPlatformReasoning,
    mustHaveSkillsMet: zod_1.z.array(zod_1.z.string()),
    mustHaveSkillsMissing: zod_1.z.array(zod_1.z.string()),
    estimatedOnboardingTime: zod_1.z.string(),
    aiConfidenceScore: zod_1.z.number().min(0).max(100),
});
exports.ZodPlatformCandidateResultArray = zod_1.z.array(exports.ZodPlatformCandidateResult);
const validateWithSchema = (schema, payload) => {
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        const details = parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        }));
        throw new Error(`Schema validation failed: ${JSON.stringify(details)}`);
    }
    return parsed.data;
};
exports.validateWithSchema = validateWithSchema;
