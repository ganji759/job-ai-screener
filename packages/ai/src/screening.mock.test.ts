import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runScreening } from './screening';
import { flashModel } from './client';
import type { Job, Applicant } from '../../db/src/types';

// Mock the client to intercept API calls
vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./client')>();
  return {
    ...actual,
    flashModel: {
      generateContent: vi.fn(),
    },
  };
});

describe('runScreening Mock Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a batch of candidates and return normalized results', async () => {
    const mockJob: Job = {
      _id: 'job_123',
      title: 'Senior TypeScript Developer',
      requirements: {
        skills: ['TypeScript', 'Node.js'],
        experience_years: 5,
        education_level: "Bachelor's",
      },
      scoring_weights: {
        skills: 0.4,
        experience: 0.4,
        education: 0.1,
        cultural_fit: 0.1,
      },
    } as any;

    const mockApplicants: Applicant[] = [
      {
        _id: 'app_abc',
        job_id: 'job_123',
        source: 'umurava_platform',
        parsed_profile: {
          firstName: 'Alice',
          lastName: 'Dev',
          email: 'alice@example.com',
          headline: 'Senior TypeScript Engineer',
          location: 'Kigali, Rwanda',
          skills: [
            { name: 'TypeScript', level: 'Expert', yearsOfExperience: 6 },
            { name: 'Node.js', level: 'Advanced', yearsOfExperience: 5 },
          ],
          experience: [
            {
              company: 'TechCorp',
              role: 'Senior Engineer',
              startDate: '2018-01',
              endDate: 'Present',
              description: 'Built scalable backend services.',
              technologies: ['TypeScript', 'Node.js'],
              isCurrent: true,
            },
          ],
          education: [
            {
              institution: 'UR',
              degree: "Bachelor's",
              fieldOfStudy: 'Computer Science',
              startYear: 2014,
              endYear: 2018,
            },
          ],
          projects: [],
          availability: { status: 'Available', type: 'Full-time' },
        },
      },
    ];

    // Simulate a valid Gemini JSON response
    const mockGeminiResponse = {
      response: {
        text: () => JSON.stringify({
          evaluations: [{
            candidate_index: 0,
            dimension_scores: { skills: 90, experience: 80, education: 70, cultural_fit: 85 },
            composite_score: 82,
            strengths: ['Strong technical background'],
            gaps: [],
            recommendation: 'Strong hire'
          }]
        })
      }
    };

    vi.mocked(flashModel.generateContent).mockResolvedValue(mockGeminiResponse as any);

    const results = await runScreening({
      job: mockJob,
      applicants: mockApplicants,
      runId: 'run_999'
    });

    expect(results).toHaveLength(1);
    expect(results[0].applicant_id).toBe('app_abc');
    expect(results[0].composite_score).toBe(100); // Normalised to 100 as it's the only candidate
    expect(results[0].model_version).toBe('gemini-1.5-flash');
    expect(vi.mocked(flashModel.generateContent)).toHaveBeenCalledTimes(1);
  });
});
