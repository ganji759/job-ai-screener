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

export const ParsedProfileSchema = z.object({
  name:             z.string(),
  skills:           z.array(z.string()),
  experience_years: z.number().int().min(0),
  education:        z.string(),
  summary:          z.string().max(500),
});

export type CandidateEval    = z.infer<typeof CandidateEval>;
export type BatchEvalOutput  = z.infer<typeof BatchEvalOutput>;
export type ParsedProfile    = z.infer<typeof ParsedProfileSchema>;