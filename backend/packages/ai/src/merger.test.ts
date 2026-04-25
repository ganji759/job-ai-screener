import { describe, it, expect } from 'vitest';
import { mergeAndRank } from './merger';
import type { CandidateEval } from './schemas';

type EvalWithId = CandidateEval & { applicant_id: string };

describe('mergeAndRank', () => {
  it('should return empty array for empty input', () => {
    const result = mergeAndRank([]);
    expect(result).toEqual([]);
  });

  it('should rank candidates by composite score (descending)', () => {
    const evals: EvalWithId[] = [
      {
        candidate_index: 0,
        applicant_id: 'a1',
        dimension_scores: { skills: 80, experience: 70, education: 60, cultural_fit: 50 },
        composite_score: 65,
        strengths: ['Good'],
        gaps: [],
        recommendation: 'Consider',
      },
      {
        candidate_index: 1,
        applicant_id: 'a2',
        dimension_scores: { skills: 90, experience: 85, education: 80, cultural_fit: 75 },
        composite_score: 82,
        strengths: ['Excellent'],
        gaps: [],
        recommendation: 'Strong hire',
      },
      {
        candidate_index: 2,
        applicant_id: 'a3',
        dimension_scores: { skills: 50, experience: 40, education: 30, cultural_fit: 35 },
        composite_score: 38,
        strengths: ['Learning'],
        gaps: ['Experience'],
        recommendation: 'Reject',
      },
    ];

    const result = mergeAndRank(evals);

    expect(result[0].applicant_id).toBe('a2'); // Highest score
    expect(result[1].applicant_id).toBe('a1');
    expect(result[2].applicant_id).toBe('a3'); // Lowest score
  });

  it('should normalize scores to 0-100 range', () => {
    const evals: EvalWithId[] = [
      {
        candidate_index: 0,
        applicant_id: 'a1',
        dimension_scores: { skills: 80, experience: 70, education: 60, cultural_fit: 50 },
        composite_score: 10,
        strengths: ['Good'],
        gaps: [],
        recommendation: 'Consider',
      },
      {
        candidate_index: 1,
        applicant_id: 'a2',
        dimension_scores: { skills: 90, experience: 85, education: 80, cultural_fit: 75 },
        composite_score: 20,
        strengths: ['Excellent'],
        gaps: [],
        recommendation: 'Strong hire',
      },
      {
        candidate_index: 2,
        applicant_id: 'a3',
        dimension_scores: { skills: 50, experience: 40, education: 30, cultural_fit: 35 },
        composite_score: 5,
        strengths: ['Learning'],
        gaps: ['Experience'],
        recommendation: 'Reject',
      },
    ];

    const result = mergeAndRank(evals);

    // After normalization: min=5, max=20
    // a2 (20): ((20-5)/(20-5))*100 = 100
    // a1 (10): ((10-5)/(20-5))*100 = 33
    // a3 (5):  ((5-5)/(20-5))*100 = 0

    expect(result[0].composite_score).toBe(100);
    expect(result[2].composite_score).toBe(0);
  });

  it('should handle single candidate', () => {
    const evals: EvalWithId[] = [
      {
        candidate_index: 0,
        applicant_id: 'a1',
        dimension_scores: { skills: 80, experience: 70, education: 60, cultural_fit: 50 },
        composite_score: 65,
        strengths: ['Good'],
        gaps: [],
        recommendation: 'Consider',
      },
    ];

    const result = mergeAndRank(evals);

    expect(result.length).toBe(1);
    expect(result[0].composite_score).toBe(100); // Single candidate gets 100
  });

  it('should handle all same scores', () => {
    const evals: EvalWithId[] = [
      {
        candidate_index: 0,
        applicant_id: 'a1',
        dimension_scores: { skills: 70, experience: 70, education: 70, cultural_fit: 70 },
        composite_score: 70,
        strengths: ['Good'],
        gaps: [],
        recommendation: 'Consider',
      },
      {
        candidate_index: 1,
        applicant_id: 'a2',
        dimension_scores: { skills: 70, experience: 70, education: 70, cultural_fit: 70 },
        composite_score: 70,
        strengths: ['Good'],
        gaps: [],
        recommendation: 'Consider',
      },
    ];

    const result = mergeAndRank(evals);

    // All same scores should normalize to 100
    expect(result.every(r => r.composite_score === 100)).toBe(true);
  });

  it('should preserve all eval data after ranking', () => {
    const evals: EvalWithId[] = [
      {
        candidate_index: 0,
        applicant_id: 'a1',
        dimension_scores: { skills: 80, experience: 70, education: 60, cultural_fit: 50 },
        composite_score: 65,
        strengths: ['Strong TypeScript', 'Good communication'],
        gaps: ['No cloud experience'],
        recommendation: 'Consider',
      },
    ];

    const result = mergeAndRank(evals);

    expect(result[0].dimension_scores).toEqual(evals[0].dimension_scores);
    expect(result[0].strengths).toEqual(evals[0].strengths);
    expect(result[0].gaps).toEqual(evals[0].gaps);
    expect(result[0].recommendation).toBe(evals[0].recommendation);
  });
});