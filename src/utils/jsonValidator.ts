import { z, type ZodTypeAny } from "zod";

export const ZodUmuravaProfile = z.object({
  id: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  title: z.string(),
  summary: z.string().optional(),
  skills: z.array(z.string()),
  languages: z.array(z.object({ name: z.string(), level: z.string() })),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      description: z.string(),
      yearsInRole: z.number(),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string(),
      graduationYear: z.number().int(),
    }),
  ),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string(), year: z.number().int() })).optional(),
  totalYearsExperience: z.number(),
  availableFrom: z.string().optional(),
  expectedSalary: z.number().optional(),
  location: z.string(),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "flexible"]),
});

export const ZodJobRequirements = z.object({
  title: z.string().optional().default("Untitled Role"),
  description: z.string().optional().default(""),
  mustHaveSkills: z.array(z.string()).default([]),
  niceToHaveSkills: z.array(z.string()).default([]),
  minYearsExperience: z.number().min(0).default(0),
  educationLevel: z.enum(["none", "certificate", "bachelor", "master", "phd"]),
  domain: z.string().default("general"),
  location: z.string().optional(),
  remoteAllowed: z.boolean().default(false),
  salaryRange: z
    .object({
      min: z.number().int().nonnegative(),
      max: z.number().int().nonnegative(),
      currency: z.string(),
    })
    .optional(),
  softSkills: z.array(z.string()).optional(),
});

export const ZodScoringBreakdown = z.object({
  skillsMatch: z.number().min(0).max(100),
  experienceMatch: z.number().min(0).max(100),
  educationMatch: z.number().min(0).max(100),
  culturalFit: z.number().min(0).max(100),
});

export const ZodCandidateResult = z.object({
  candidateId: z.string(),
  rank: z.number().int().optional().default(0),
  totalScore: z.number().min(0).max(100),
  breakdown: ZodScoringBreakdown,
  strengths: z.array(z.string()).min(3).max(3),
  gaps: z.array(z.string()).min(1).max(2),
  recommendation: z.string(),
  mustHaveSkillsMet: z.array(z.string()),
  mustHaveSkillsMissing: z.array(z.string()),
  estimatedOnboardingTime: z.string(),
  aiConfidenceScore: z.number().min(0).max(100),
});

export const ZodCandidateResultArray = z.array(ZodCandidateResult);

export const ZodPoolInsights = z.object({
  scoreDistribution: z.array(z.object({ range: z.string(), count: z.number().int() })),
  topSkillsFound: z.array(z.string()),
  skillGapsInPool: z.array(z.string()),
  recruitingRecommendation: z.string(),
  averageScore: z.number().min(0).max(100),
});

export const validateWithSchema = <T>(schema: ZodTypeAny, payload: unknown): T => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    }));
    throw new Error(`Schema validation failed: ${JSON.stringify(details)}`);
  }
  return parsed.data as T;
};
