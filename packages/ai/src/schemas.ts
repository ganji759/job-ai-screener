import { z } from "zod";

export const DimensionScores = z.object({
  skills:       z.number().min(0).max(100),
  experience:   z.number().min(0).max(100),
  education:    z.number().min(0).max(100),
  cultural_fit: z.number().min(0).max(100),
});

export const CandidateEval = z.object({
  candidate_index: z.number().int().min(0),
  dimension_scores: DimensionScores,
  composite_score: z.number().min(0).max(100),
  strengths: z.array(z.string()).min(1).max(5),
  gaps:      z.array(z.string()).max(5),
  recommendation: z.enum(["Strong hire", "Consider", "Reject"]),
});

export const BatchEvalOutput = z.object({
  evaluations: z.array(CandidateEval),
});

const SkillSchema = z.object({
  name: z.string(),
  level: z.enum(["Beginner", "Intermediate", "Advanced", "Expert"]),
  yearsOfExperience: z.number().int().min(0),
});

const LanguageSchema = z.object({
  name: z.string(),
  proficiency: z.enum(["Basic", "Conversational", "Fluent", "Native"]),
});

const WorkExperienceSchema = z.object({
  company: z.string(),
  role: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  description: z.string(),
  technologies: z.array(z.string()).default([]),
  isCurrent: z.boolean(),
});

const EducationEntrySchema = z.object({
  institution: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string(),
  startYear: z.number().int(),
  endYear: z.number().int(),
});

const CertificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  issueDate: z.string(),
});

const ProjectSchema = z.object({
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()).default([]),
  role: z.string(),
  link: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
});

const AvailabilitySchema = z.object({
  status: z.enum(["Available", "Open to Opportunities", "Not Available"]),
  type: z.enum(["Full-time", "Part-time", "Contract"]),
  startDate: z.string().optional(),
});

const SocialLinksSchema = z
  .object({
    linkedin: z.string().optional(),
    github: z.string().optional(),
    portfolio: z.string().optional(),
  })
  .catchall(z.string().optional());

export const ParsedProfileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  headline: z.string(),
  bio: z.string().optional(),
  location: z.string(),
  skills: z.array(SkillSchema),
  languages: z.array(LanguageSchema).default([]),
  experience: z.array(WorkExperienceSchema),
  education: z.array(EducationEntrySchema),
  certifications: z.array(CertificationSchema).default([]),
  projects: z.array(ProjectSchema),
  availability: AvailabilitySchema,
  socialLinks: SocialLinksSchema.optional(),
});

export type CandidateEval    = z.infer<typeof CandidateEval>;
export type BatchEvalOutput  = z.infer<typeof BatchEvalOutput>;
export type ParsedProfile    = z.infer<typeof ParsedProfileSchema>;
