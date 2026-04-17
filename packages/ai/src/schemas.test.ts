import { describe, it, expect } from 'vitest';
import {
  DimensionScores,
  CandidateEval,
  BatchEvalOutput,
  ParsedProfileSchema,
} from './schemas';

describe('Zod Schemas', () => {
  describe('DimensionScores', () => {
    it('should accept valid scores', () => {
      const validScores = {
        skills: 85,
        experience: 70,
        education: 90,
        cultural_fit: 75,
      };

      const result = DimensionScores.safeParse(validScores);
      expect(result.success).toBe(true);
    });

    it('should reject scores below 0', () => {
      const invalidScores = {
        skills: -10,
        experience: 70,
        education: 90,
        cultural_fit: 75,
      };

      const result = DimensionScores.safeParse(invalidScores);
      expect(result.success).toBe(false);
    });

    it('should reject scores above 100', () => {
      const invalidScores = {
        skills: 150,
        experience: 70,
        education: 90,
        cultural_fit: 75,
      };

      const result = DimensionScores.safeParse(invalidScores);
      expect(result.success).toBe(false);
    });
  });

  describe('CandidateEval', () => {
    it('should accept valid candidate evaluation', () => {
      const validEval = {
        candidate_index: 0,
        dimension_scores: {
          skills: 85,
          experience: 70,
          education: 90,
          cultural_fit: 75,
        },
        composite_score: 80,
        strengths: ['Strong Python skills', '5+ years experience'],
        gaps: ['No cloud experience'],
        recommendation: 'Strong hire' as const,
      };

      const result = CandidateEval.safeParse(validEval);
      expect(result.success).toBe(true);
    });

    it('should reject invalid recommendation', () => {
      const invalidEval = {
        candidate_index: 0,
        dimension_scores: {
          skills: 85,
          experience: 70,
          education: 90,
          cultural_fit: 75,
        },
        composite_score: 80,
        strengths: ['Strong skills'],
        gaps: [],
        recommendation: 'Maybe',
      };

      const result = CandidateEval.safeParse(invalidEval);
      expect(result.success).toBe(false);
    });

    it('should reject empty strengths array', () => {
      const invalidEval = {
        candidate_index: 0,
        dimension_scores: {
          skills: 85,
          experience: 70,
          education: 90,
          cultural_fit: 75,
        },
        composite_score: 80,
        strengths: [],
        gaps: [],
        recommendation: 'Consider' as const,
      };

      const result = CandidateEval.safeParse(invalidEval);
      expect(result.success).toBe(false);
    });

    it('should reject more than 5 strengths', () => {
      const invalidEval = {
        candidate_index: 0,
        dimension_scores: {
          skills: 85,
          experience: 70,
          education: 90,
          cultural_fit: 75,
        },
        composite_score: 80,
        strengths: ['A', 'B', 'C', 'D', 'E', 'F'],
        gaps: [],
        recommendation: 'Consider' as const,
      };

      const result = CandidateEval.safeParse(invalidEval);
      expect(result.success).toBe(false);
    });
  });

  describe('BatchEvalOutput', () => {
    it('should accept valid batch output', () => {
      const validBatch = {
        evaluations: [
          {
            candidate_index: 0,
            dimension_scores: {
              skills: 85,
              experience: 70,
              education: 90,
              cultural_fit: 75,
            },
            composite_score: 80,
            strengths: ['Strong skills'],
            gaps: [],
            recommendation: 'Consider' as const,
          },
          {
            candidate_index: 1,
            dimension_scores: {
              skills: 60,
              experience: 50,
              education: 70,
              cultural_fit: 65,
            },
            composite_score: 60,
            strengths: ['Good culture fit'],
            gaps: ['Limited experience'],
            recommendation: 'Consider' as const,
          },
        ],
      };

      const result = BatchEvalOutput.safeParse(validBatch);
      expect(result.success).toBe(true);
    });
  });

  describe('ParsedProfileSchema', () => {
    it('should accept valid profile', () => {
      const validProfile = {
        name: 'John Doe',
        skills: ['Python', 'TypeScript', 'React'],
        experience_years: 5,
        education: 'BS Computer Science',
        summary: 'Experienced developer',
      };

      const result = ParsedProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should reject summary over 500 chars', () => {
      const invalidProfile = {
        name: 'John Doe',
        skills: ['Python'],
        experience_years: 5,
        education: 'BS',
        summary: 'A'.repeat(501),
      };

      const result = ParsedProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('should reject negative experience years', () => {
      const invalidProfile = {
        name: 'John Doe',
        skills: ['Python'],
        experience_years: -1,
        education: 'BS',
        summary: 'Experienced',
      };

      const result = ParsedProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });
});