import { describe, it, expect } from 'vitest';
import { buildScreeningPrompt } from './prompts/screen.prompt';
import { buildNormalisePrompt } from './prompts/normalise.prompt';
import type { Job, ParsedProfile } from '../../db/src/types';

describe('Prompt Builders', () => {
  describe('buildScreeningPrompt', () => {
    const sampleJob: Job = {
      _id: 'job-123',
      title: 'Senior TypeScript Developer',
      description: 'Build scalable backend services',
      requirements: {
        skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
        experience_years: 5,
        education_level: 'Bachelor\'s degree',
        nice_to_have: ['AWS', 'Docker'],
      },
      scoring_weights: {
        skills: 0.40,
        experience: 0.35,
        education: 0.15,
        cultural_fit: 0.10,
      },
    };

    const sampleCandidates: ParsedProfile[] = [
      {
        name: 'Alice Smith',
        skills: ['TypeScript', 'Node.js', 'React'],
        experience_years: 6,
        education: 'BS Computer Science',
        summary: 'Full-stack developer with 6 years experience',
      },
      {
        name: 'Bob Johnson',
        skills: ['Python', 'Django'],
        experience_years: 3,
        education: 'BS Information Technology',
        summary: 'Backend developer transitioning to TypeScript',
      },
    ];

    it('should include job title and requirements', () => {
      const prompt = buildScreeningPrompt(sampleJob, sampleCandidates);

      expect(prompt).toContain('Senior TypeScript Developer');
      expect(prompt).toContain('TypeScript, Node.js, PostgreSQL');
      expect(prompt).toContain('5 years');
    });

    it('should include scoring weights', () => {
      const prompt = buildScreeningPrompt(sampleJob, sampleCandidates);

      expect(prompt).toContain('skills: 0.4');
      expect(prompt).toContain('experience: 0.35');
      expect(prompt).toContain('education: 0.15');
      expect(prompt).toContain('cultural_fit: 0.1');
    });

    it('should include composite score formula', () => {
      const prompt = buildScreeningPrompt(sampleJob, sampleCandidates);

      expect(prompt).toContain('composite_score =');
      expect(prompt).toContain('skills_score * 0.4');
    });

    it('should include all candidates with indices', () => {
      const prompt = buildScreeningPrompt(sampleJob, sampleCandidates);

      expect(prompt).toContain('Candidate 0 (index: 0)');
      expect(prompt).toContain('Candidate 1 (index: 1)');
      expect(prompt).toContain('Alice Smith');
      expect(prompt).toContain('Bob Johnson');
    });

    it('should include scoring rubric', () => {
      const prompt = buildScreeningPrompt(sampleJob, sampleCandidates);

      expect(prompt).toContain('## Scoring rubric');
      expect(prompt).toContain('skills:');
      expect(prompt).toContain('experience:');
      expect(prompt).toContain('education:');
      expect(prompt).toContain('cultural_fit:');
    });

    it('should include nice-to-have skills', () => {
      const prompt = buildScreeningPrompt(sampleJob, sampleCandidates);

      expect(prompt).toContain('AWS, Docker');
    });

    it('should handle empty nice-to-have', () => {
      const jobWithoutNiceToHave: Job = {
        ...sampleJob,
        requirements: {
          ...sampleJob.requirements,
          nice_to_have: [],
        },
      };

      const prompt = buildScreeningPrompt(jobWithoutNiceToHave, sampleCandidates);
      expect(prompt).toContain('none');
    });

    it('should specify JSON output format', () => {
      const prompt = buildScreeningPrompt(sampleJob, sampleCandidates);

      expect(prompt).toContain('Required JSON output schema');
      expect(prompt).toContain('evaluations');
      expect(prompt).toContain('candidate_index');
      expect(prompt).toContain('dimension_scores');
    });
  });

  describe('buildNormalisePrompt', () => {
    const sampleResume = `
John Doe
Software Engineer

Experience:
- Senior Developer at Tech Corp (2020-2024)
- Developer at StartupXYZ (2018-2020)

Skills: Python, JavaScript, React, Node.js

Education:
BS Computer Science, University of Tech

Summary:
Passionate software engineer with 6 years of experience building web applications.
    `;

    it('should include resume text', () => {
      const prompt = buildNormalisePrompt(sampleResume);

      expect(prompt).toContain('John Doe');
      expect(prompt).toContain('Software Engineer');
      expect(prompt).toContain('Tech Corp');
    });

    it('should specify JSON-only output', () => {
      const prompt = buildNormalisePrompt(sampleResume);

      expect(prompt).toContain('Return ONLY JSON');
      expect(prompt).toContain('no markdown');
    });

    it('should specify required output fields', () => {
      const prompt = buildNormalisePrompt(sampleResume);

      expect(prompt).toContain('"name":');
      expect(prompt).toContain('"skills":');
      expect(prompt).toContain('"experience_years":');
      expect(prompt).toContain('"education":');
      expect(prompt).toContain('"summary":');
    });

    it('should instruct to infer missing fields', () => {
      const prompt = buildNormalisePrompt(sampleResume);

      expect(prompt).toContain('Infer missing fields');
      expect(prompt).toContain('never leave them null');
    });
  });
});