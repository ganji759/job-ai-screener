import { describe, it, expect } from 'vitest';
import { mergeAndRank } from './packages/ai/src/merger';
import { CandidateEval } from './packages/ai/src/schemas';

type EvalWithId = CandidateEval & { applicant_id: string };

describe('mergeAndRank', () => {
  it('should return an empty array when given no evaluations', () => {
    expect(mergeAndRank([])).toEqual([]);
  });

  it('should normalize a single candidate to a score of 100', () => {
    const evals: EvalWithId[] = [{
      applicant_id: '1',
      candidate_index: 0,
      composite_score: 45,
      dimension_scores: { skills: 50, experience: 40, education: 30, cultural_fit: 60 },
      strengths: ['Testing'],
      gaps: [],
      recommendation: 'Consider'
    }];

    const result = mergeAndRank(evals);
    expect(result[0].composite_score).toBe(100);
  });

  it('should normalize scores across the 0-100 range based on min/max', () => {
    const evals: EvalWithId[] = [
      { applicant_id: 'low', composite_score: 10, candidate_index: 0, dimension_scores: {} as any, strengths: [], gaps: [], recommendation: 'Reject' },
      { applicant_id: 'mid', composite_score: 30, candidate_index: 1, dimension_scores: {} as any, strengths: [], gaps: [], recommendation: 'Consider' },
      { applicant_id: 'high', composite_score: 50, candidate_index: 2, dimension_scores: {} as any, strengths: [], gaps: [], recommendation: 'Strong hire' },
    ];

    const result = mergeAndRank(evals);
    
    // High (50) becomes 100
    // Low (10) becomes 0
    // Mid (30) becomes (30-10)/(50-10) * 100 = 50
    expect(result.find(r => r.applicant_id === 'high')?.composite_score).toBe(100);
    expect(result.find(r => r.applicant_id === 'mid')?.composite_score).toBe(50);
    expect(result.find(r => r.applicant_id === 'low')?.composite_score).toBe(0);
  });

  it('should sort results by composite score descending', () => {
    const evals: EvalWithId[] = [
      { applicant_id: '1', composite_score: 20, candidate_index: 0, dimension_scores: {} as any, strengths: [], gaps: [], recommendation: 'Reject' },
      { applicant_id: '2', composite_score: 80, candidate_index: 1, dimension_scores: {} as any, strengths: [], gaps: [], recommendation: 'Strong hire' },
      { applicant_id: '3', composite_score: 50, candidate_index: 2, dimension_scores: {} as any, strengths: [], gaps: [], recommendation: 'Consider' },
    ];

    const result = mergeAndRank(evals);
    
    expect(result[0].applicant_id).toBe('2');
    expect(result[1].applicant_id).toBe('3');
    expect(result[2].applicant_id).toBe('1');
    expect(result[0].composite_score).toBeGreaterThan(result[1].composite_score);
  });
});