/**
 * Standalone Gemini Integration Test
 * Run with: npx tsx scripts/test-gemini.ts
 */

import { flashModel } from '../packages/ai/src/client';
import { geminiNormalise } from '../packages/ai/src/normalise';
import { runScreening } from '../packages/ai/src/screening';
import { mergeAndRank } from '../packages/ai/src/merger';
import type { Job, Applicant, ParsedProfile } from '../packages/db/src/types';

async function testGeminiConnection() {
  console.log('🔍 Testing Gemini API connection...\n');

  const result = await flashModel.generateContent('Reply with just: OK');
  const text = result.response.text().trim();

  console.log('✅ Gemini API connected!');
  console.log(`   Response: "${text}"\n`);
  return true;
}

async function testResumeNormalisation() {
  console.log('📄 Testing Resume Normalisation...\n');

  const resume = `
Sarah Chen
Senior Software Engineer

EXPERIENCE
Staff Engineer, Google (2020-Present)
- Led migration to microservices architecture
- Mentored team of 5 engineers

Senior Developer, Startup Inc (2017-2020)
- Built REST APIs serving 1M+ daily requests

SKILLS
Languages: TypeScript, Python, Go
Frameworks: Node.js, Express, React
Tools: Docker, Kubernetes, AWS, GCP

EDUCATION
M.S. Computer Science, Stanford University (2017)

SUMMARY
Engineer with 9 years building scalable distributed systems.
  `;

  console.log('Input resume:');
  console.log(resume.substring(0, 200) + '...\n');

  const profile = await geminiNormalise(resume);

  console.log('✅ Normalised profile:');
  console.log(`   Name: ${profile.name}`);
  console.log(`   Experience: ${profile.experience_years} years`);
  console.log(`   Skills: ${profile.skills.slice(0, 5).join(', ')}...`);
  console.log(`   Education: ${profile.education}`);
  console.log(`   Summary: ${profile.summary.substring(0, 80)}...\n`);

  return profile;
}

async function testCandidateScreening() {
  console.log('🎯 Testing Candidate Screening...\n');

  const job: Job = {
    _id: 'test-job-1',
    title: 'Senior TypeScript Developer',
    description: 'Build backend services with TypeScript and Node.js',
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

  const applicants: Applicant[] = [
    {
      _id: 'app-1',
      job_id: job._id,
      source: 'resume_pdf' as const,
      parsed_profile: {
        name: 'Alice Developer',
        skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL', 'AWS'],
        experience_years: 7,
        education: 'BS Computer Science',
        summary: 'Senior full-stack developer with strong TypeScript expertise',
      },
    },
    {
      _id: 'app-2',
      job_id: job._id,
      source: 'upload_csv' as const,
      parsed_profile: {
        name: 'Bob Coder',
        skills: ['Python', 'Django', 'PostgreSQL'],
        experience_years: 3,
        education: 'BS Information Technology',
        summary: 'Backend developer transitioning to TypeScript',
      },
    },
    {
      _id: 'app-3',
      job_id: job._id,
      source: 'umurava_platform' as const,
      parsed_profile: {
        name: 'Charlie Engineer',
        skills: ['TypeScript', 'Go', 'Kubernetes', 'AWS'],
        experience_years: 10,
        education: 'MS Computer Science',
        summary: 'Infrastructure engineer with full-stack experience',
      },
    },
  ];

  console.log(`Screening ${applicants.length} candidates for: ${job.title}\n`);

  const results = await runScreening({
    job,
    applicants,
    runId: 'test-run-123',
    onBatchComplete: (done, total) => {
      console.log(`   Progress: ${done}/${total} batches complete`);
    },
  });

  console.log('\n✅ Screening Results (ranked):');
  console.log('─'.repeat(70));

  results.forEach((r, idx) => {
    const applicant = applicants.find(a => a._id === r.applicant_id);
    console.log(`\n#${idx + 1}: ${applicant?.parsed_profile.name}`);
    console.log(`    Score: ${r.composite_score}/100`);
    console.log(`    Recommendation: ${r.reasoning.recommendation}`);
    console.log(`    Strengths: ${r.reasoning.strengths.join(', ')}`);
    if (r.reasoning.gaps.length > 0) {
      console.log(`    Gaps: ${r.reasoning.gaps.join(', ')}`);
    }
  });

  console.log('\n');
  return results;
}

async function testMergeAndRank() {
  console.log('📊 Testing Cross-Batch Normalisation...\n');

  // Simulate results from two different batches
  const batch1Results = [
    {
      applicant_id: 'a1',
      composite_score: 85,
      dimension_scores: { skills: 90, experience: 80, education: 85, cultural_fit: 85 },
      strengths: ['Strong TypeScript'],
      gaps: [],
      recommendation: 'Strong hire' as const,
      candidate_index: 0,
    },
    {
      applicant_id: 'a2',
      composite_score: 70,
      dimension_scores: { skills: 75, experience: 65, education: 70, cultural_fit: 70 },
      strengths: ['Good skills'],
      gaps: ['Less experience'],
      recommendation: 'Consider' as const,
      candidate_index: 1,
    },
  ];

  const batch2Results = [
    {
      applicant_id: 'a3',
      composite_score: 90,
      dimension_scores: { skills: 95, experience: 85, education: 90, cultural_fit: 90 },
      strengths: ['Excellent fit'],
      gaps: [],
      recommendation: 'Strong hire' as const,
      candidate_index: 0,
    },
    {
      applicant_id: 'a4',
      composite_score: 60,
      dimension_scores: { skills: 65, experience: 55, education: 60, cultural_fit: 60 },
      strengths: ['Learning fast'],
      gaps: ['Junior level'],
      recommendation: 'Consider' as const,
      candidate_index: 1,
    },
  ];

  console.log('Batch 1 scores:', batch1Results.map(r => r.composite_score));
  console.log('Batch 2 scores:', batch2Results.map(r => r.composite_score));

  const allEvals = [...batch1Results, ...batch2Results];
  const ranked = mergeAndRank(allEvals);

  console.log('\n✅ Normalised & Ranked:');
  ranked.forEach((r, idx) => {
    console.log(`   #${idx + 1} ${r.applicant_id}: ${r.composite_score}`);
  });

  console.log('');
  return ranked;
}

// Main test runner
async function main() {
  console.log('═'.repeat(70));
  console.log('  GEMINI AI INTEGRATION TEST');
  console.log('═'.repeat(70));
  console.log('');

  if (!process.env.GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY not set!');
    console.error('   Create a .env file with your API key.');
    console.error('   See .env.example for format.\n');
    process.exit(1);
  }

  try {
    // Test 1: API Connection
    await testGeminiConnection();

    // Test 2: Resume Normalisation
    await testResumeNormalisation();

    // Test 3: Candidate Screening
    await testCandidateScreening();

    // Test 4: Cross-batch normalisation
    await testMergeAndRank();

    console.log('═'.repeat(70));
    console.log('  ✅ ALL TESTS PASSED');
    console.log('═'.repeat(70));
  } catch (error) {
    console.log('═'.repeat(70));
    console.error('  ❌ TEST FAILED');
    console.error('═'.repeat(70));
    console.error('\nError:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();