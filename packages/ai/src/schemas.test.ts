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
    const validProfile = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@example.com',
      headline: 'Senior Backend Engineer – Node.js & TypeScript',
      bio: 'Experienced engineer with 6 years building distributed systems.',
      location: 'Kigali, Rwanda',
      skills: [
        { name: 'TypeScript', level: 'Expert', yearsOfExperience: 6 },
        { name: 'Node.js', level: 'Advanced', yearsOfExperience: 5 },
      ],
      languages: [{ name: 'English', proficiency: 'Native' }],
      experience: [
        {
          company: 'TechCorp',
          role: 'Senior Engineer',
          startDate: '2020-01',
          endDate: 'Present',
          description: 'Led backend migration to microservices.',
          technologies: ['TypeScript', 'Node.js'],
          isCurrent: true,
        },
      ],
      education: [
        {
          institution: 'University of Rwanda',
          degree: "Bachelor's",
          fieldOfStudy: 'Computer Science',
          startYear: 2014,
          endYear: 2018,
        },
      ],
      projects: [
        {
          name: 'API Gateway',
          description: 'Open-source API gateway.',
          technologies: ['TypeScript'],
          role: 'Author',
          startDate: '2021-01',
          endDate: '2022-06',
        },
      ],
      availability: { status: 'Available', type: 'Full-time' },
    };

    it('should accept a fully valid profile', () => {
      const result = ParsedProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should accept a profile with optional fields omitted', () => {
      const minimal = {
        ...validProfile,
        bio: undefined,
        languages: undefined,
        certifications: undefined,
        socialLinks: undefined,
      };
      const result = ParsedProfileSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('should reject an invalid skill level', () => {
      const bad = {
        ...validProfile,
        skills: [{ name: 'TypeScript', level: 'Ninja', yearsOfExperience: 5 }],
      };
      const result = ParsedProfileSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('should reject a negative yearsOfExperience on a skill', () => {
      const bad = {
        ...validProfile,
        skills: [{ name: 'TypeScript', level: 'Expert', yearsOfExperience: -1 }],
      };
      const result = ParsedProfileSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('should reject an invalid availability status', () => {
      const bad = {
        ...validProfile,
        availability: { status: 'Busy', type: 'Full-time' },
      };
      const result = ParsedProfileSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('should reject an invalid language proficiency', () => {
      const bad = {
        ...validProfile,
        languages: [{ name: 'French', proficiency: 'OK' }],
      };
      const result = ParsedProfileSchema.safeParse(bad);
      expect(result.success).toBe(false);
    });

    it('should accept extra social link keys beyond the known ones', () => {
      const withExtra = {
        ...validProfile,
        socialLinks: { linkedin: 'https://linkedin.com/in/jane', twitter: 'https://twitter.com/jane' },
      };
      const result = ParsedProfileSchema.safeParse(withExtra);
      expect(result.success).toBe(true);
    });
  });
});
