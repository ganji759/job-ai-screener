import { describe, it, expect, beforeAll } from 'vitest';
import { flashModel } from './client';
import { buildNormalisePrompt } from './prompts/normalise.prompt';
import { buildScreeningPrompt } from './prompts/screen.prompt';
import { ParsedProfileSchema, BatchEvalOutput } from './schemas';
import type { Job, ParsedProfile } from '../../db/src/types';

const apiKey = process.env.GEMINI_API_KEY;

describe.skipIf(!apiKey)('Gemini Integration', () => {
  beforeAll(() => {
    console.log('Gemini API key found, running integration tests...');
  });

  describe('Model Connection', () => {
    it('should connect to Gemini API', async () => {
      const result = await flashModel.generateContent('Say "OK"');
      const text = result.response.text();
      expect(text).toBeTruthy();
      console.log('Gemini response:', text);
    });
  });

  describe('Resume Normalisation', () => {
    it('should parse a resume into structured profile', async () => {
      const resumeText = `
Sarah Chen
Senior Software Engineer

EXPERIENCE
Staff Engineer, Google (2020-Present)
- Led migration of monolithic backend to microservices
- Mentored team of 5 junior engineers

Senior Developer, Startup Inc (2017-2020)
- Built REST APIs serving 1M+ daily requests
- Implemented CI/CD pipelines

SKILLS
Languages: TypeScript, Python, Go, Rust
Frameworks: Node.js, Express, React, FastAPI
Tools: Docker, Kubernetes, AWS, GCP

EDUCATION
M.S. Computer Science, Stanford University (2017)
B.S. Computer Science, UC Berkeley (2015)

SUMMARY
Passionate engineer with 9 years of experience building scalable distributed systems.
Strong focus on developer experience and cloud infrastructure.
      `;

      const prompt = buildNormalisePrompt(resumeText);
      const result = await flashModel.generateContent(prompt);
      const raw = result.response.text();

      console.log('Raw normalised output:', raw);

      const profile = ParsedProfileSchema.parse(JSON.parse(raw));

      expect(profile.name).toContain('Sarah');
      expect(profile.experience_years).toBeGreaterThanOrEqual(8);
      expect(profile.skills.length).toBeGreaterThan(3);
      expect(profile.education).toBeTruthy();
      expect(profile.summary).toBeTruthy();
    });

    it('should handle minimal resume text', async () => {
      const minimalResume = `
John Smith
Developer
Skills: JavaScript
5 years experience
      `;

      const prompt = buildNormalisePrompt(minimalResume);
      const result = await flashModel.generateContent(prompt);
      const raw = result.response.text();

      const profile = ParsedProfileSchema.parse(JSON.parse(raw));

      expect(profile.name).toContain('John');
      expect(profile.experience_years).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Candidate Screening', () => {
    const sampleJob: Job = {
      _id: 'test-job-1',
      title: 'Senior TypeScript Developer',
      description: 'Build backend services',
      requirements: {
        skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
        experience_years: 5,
        education_level: 'Bachelor\'s degree',
        nice_to_have: ['AWS'],
      },
      scoring_weights: {
        skills: 0.40,
        experience: 0.35,
        education: 0.15,
        cultural_fit: 0.10,
      },
    };

    it('should evaluate a single candidate', async () => {
      const candidates: ParsedProfile[] = [
        {
          name: 'Alice Developer',
          skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
          experience_years: 6,
          education: 'BS Computer Science',
          summary: 'Full-stack developer with strong TypeScript background',
        },
      ];

      const prompt = buildScreeningPrompt(sampleJob, candidates);
      const result = await flashModel.generateContent(prompt);
      const raw = result.response.text();

      console.log('Raw screening output:', raw);

      const output = BatchEvalOutput.parse(JSON.parse(raw));

      expect(output.evaluations).toHaveLength(1);
      expect(output.evaluations[0].candidate_index).toBe(0);
      expect(output.evaluations[0].composite_score).toBeGreaterThanOrEqual(0);
      expect(output.evaluations[0].composite_score).toBeLessThanOrEqual(100);
      expect(output.evaluations[0].strengths.length).toBeGreaterThan(0);
      expect(output.evaluations[0].recommendation).toMatch(
        /^(Strong hire|Consider|Reject)$/
      );
    });

    it.skip('should evaluate multiple candidates', async () => {
      const candidates: ParsedProfile[] = [
        {
          name: 'Alice Developer',
          skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
          experience_years: 6,
          education: 'BS Computer Science',
          summary: 'Full-stack developer with strong TypeScript background',
        },
        {
          name: 'Bob Coder',
          skills: ['Python', 'Django', 'PostgreSQL'],
          experience_years: 3,
          education: 'BS Information Technology',
          summary: 'Backend developer learning TypeScript',
        },
        {
          name: 'Charlie Engineer',
          skills: ['TypeScript', 'Go', 'Kubernetes', 'AWS'],
          experience_years: 8,
          education: 'MS Computer Science',
          summary: 'Infrastructure engineer with full-stack experience',
        },
      ];

      const prompt = buildScreeningPrompt(sampleJob, candidates);
      const result = await flashModel.generateContent(prompt);
      const raw = result.response.text();

      const output = BatchEvalOutput.parse(JSON.parse(raw));

      expect(output.evaluations).toHaveLength(3);

      // Verify each candidate has required fields
      output.evaluations.forEach((eval_, idx) => {
        expect(eval_.candidate_index).toBe(idx);
        expect(eval_.dimension_scores.skills).toBeGreaterThanOrEqual(0);
        expect(eval_.dimension_scores.skills).toBeLessThanOrEqual(100);
        expect(eval_.strengths.length).toBeGreaterThan(0);
        expect(eval_.gaps.length).toBeLessThanOrEqual(5);
      });
    });

    it('should score matching candidate higher than non-matching', async () => {
      const candidates: ParsedProfile[] = [
        {
          name: 'Perfect Match',
          skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
          experience_years: 7,
          education: 'BS Computer Science',
          summary: 'Senior TypeScript developer with 7 years experience',
        },
        {
          name: 'Poor Match',
          skills: ['Java', 'Spring'],
          experience_years: 2,
          education: 'High School',
          summary: 'Junior Java developer',
        },
      ];

      const prompt = buildScreeningPrompt(sampleJob, candidates);
      const result = await flashModel.generateContent(prompt);
      const raw = result.response.text();

      const output = BatchEvalOutput.parse(JSON.parse(raw));

      const perfectMatchEval = output.evaluations.find(e => e.candidate_index === 0);
      const poorMatchEval = output.evaluations.find(e => e.candidate_index === 1);

      expect(perfectMatchEval).toBeDefined();
      expect(poorMatchEval).toBeDefined();

      // Perfect match should score higher
      expect(perfectMatchEval!.composite_score).toBeGreaterThan(
        poorMatchEval!.composite_score
      );
    });
  });
});