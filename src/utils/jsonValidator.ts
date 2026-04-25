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

/** Loose resume fields from Gemini (PDF / unstructured) — merged with heuristics before `normalizeProfile`. */
export const ZodResumeGeminiExtraction = z
  .object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    summary: z.string().optional(),
    skills: z.array(z.string()).optional(),
    languages: z.array(z.object({ name: z.string(), level: z.string() })).optional(),
    experience: z
      .array(
        z.object({
          company: z.string(),
          title: z.string(),
          startDate: z.string(),
          endDate: z.string().optional(),
          description: z.string(),
          yearsInRole: z.number(),
        }),
      )
      .optional(),
    education: z
      .array(
        z.object({
          institution: z.string(),
          degree: z.string(),
          field: z.string(),
          graduationYear: z.number(),
        }),
      )
      .optional(),
    totalYearsExperience: z.number().optional(),
    location: z.string().optional(),
  })
  .passthrough();

/** Scenario 1 — Umurava Talent Profile Schema (structured platform ingest). */
export const ZodTalentPlatformProfile = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    skills: z.array(z.string()),
    experience_years: z.coerce.number(),
    education: z.string(),
    previous_roles: z.array(z.string()),
    portfolio_url: z.union([z.string().url(), z.literal("")]).optional(),
    github_url: z.union([z.string().url(), z.literal("")]).optional(),
    location: z.string(),
  })
  .strip();

/** Official Umurava Talent Profile (Applicant.profile when source = umurava_platform). */
export const ZodTalentProfile = z.object({
  id: z.string().min(1),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  headline: z.string(),
  bio: z.string().optional(),
  location: z.string(),
  skills: z.array(
    z.object({
      name: z.string(),
      level: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]),
      yearsOfExperience: z.number().nonnegative(),
    }),
  ),
  languages: z.array(
    z.object({
      name: z.string(),
      proficiency: z.enum(["Basic", "Conversational", "Fluent", "Native"]),
    }),
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      role: z.string(),
      startDate: z.string(),
      endDate: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      isCurrent: z.boolean(),
    }),
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      fieldOfStudy: z.string(),
      startYear: z.number(),
      endYear: z.number(),
    }),
  ),
  certifications: z
    .array(
      z.object({
        name: z.string(),
        issuer: z.string(),
        issueDate: z.string(),
      }),
    )
    .optional(),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      role: z.string(),
      link: z.string().optional(),
      startDate: z.string(),
      endDate: z.string(),
    }),
  ),
  availability: z.object({
    status: z.enum(["Available", "Open to Opportunities", "Not Available"]),
    type: z.enum(["Full-time", "Part-time", "Contract"]),
    startDate: z.string().optional(),
  }),
  socialLinks: z
    .object({
      linkedin: z.string().optional(),
      github: z.string().optional(),
      portfolio: z.string().optional(),
    })
    .optional(),
});

export type TalentProfileParsed = z.infer<typeof ZodTalentProfile>;

export const ZodPoolInsights = z.object({
  scoreDistribution: z.array(z.object({ range: z.string(), count: z.number().int() })),
  topSkillsFound: z.array(z.string()),
  skillGapsInPool: z.array(z.string()),
  recruitingRecommendation: z.string(),
  averageScore: z.number().min(0).max(100),
});

/** Scenario 1 — Umurava platform AI screening (35 / 25 / 15 / 15 / 10 point rubric). */
export const ZodPlatformScoringBreakdown = z.object({
  skillsMatch: z.number().min(0).max(35),
  experience: z.number().min(0).max(25),
  education: z.number().min(0).max(15),
  roleRelevance: z.number().min(0).max(15),
  additionalAssets: z.number().min(0).max(10),
});

export const ZodPlatformReasoning = z.object({
  strengths: z.array(z.string()).min(1).max(6),
  gaps: z.array(z.string()).min(1).max(5),
  relevanceSummary: z.string(),
  recommendation: z.string(),
  hiringRisk: z.enum(["Low", "Medium", "High"]),
});

export const ZodPlatformCandidateResult = z.object({
  candidateId: z.string(),
  rank: z.number().int().optional().default(0),
  totalScore: z.number().min(0).max(100),
  scoreBreakdown: ZodPlatformScoringBreakdown,
  reasoning: ZodPlatformReasoning,
  mustHaveSkillsMet: z.array(z.string()),
  mustHaveSkillsMissing: z.array(z.string()),
  estimatedOnboardingTime: z.string(),
  aiConfidenceScore: z.number().min(0).max(100),
});

export const ZodPlatformCandidateResultArray = z.array(ZodPlatformCandidateResult);

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
