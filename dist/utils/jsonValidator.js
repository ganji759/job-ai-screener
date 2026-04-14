"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateWithSchema = exports.ZodPoolInsights = exports.ZodCandidateResultArray = exports.ZodCandidateResult = exports.ZodScoringBreakdown = exports.ZodJobRequirements = exports.ZodUmuravaProfile = void 0;
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
exports.ZodPoolInsights = zod_1.z.object({
    scoreDistribution: zod_1.z.array(zod_1.z.object({ range: zod_1.z.string(), count: zod_1.z.number().int() })),
    topSkillsFound: zod_1.z.array(zod_1.z.string()),
    skillGapsInPool: zod_1.z.array(zod_1.z.string()),
    recruitingRecommendation: zod_1.z.string(),
    averageScore: zod_1.z.number().min(0).max(100),
});
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
