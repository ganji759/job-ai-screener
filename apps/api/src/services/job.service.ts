import { Job, JobModel, ScreeningRunModel } from '@umurava/db';
import { AppError } from '../lib/errors.js';

interface CreateJobInput {
  title: string;
  description: string;
  requirements: {
    skills: string[];
    experience_years: number;
    education_level: string;
    nice_to_have?: string[];
  };
  scoring_weights: {
    skills: number;
    experience: number;
    education: number;
    cultural_fit: number;
  };
}

export async function createJob(input: CreateJobInput): Promise<Job> {
  // Validate scoring weights sum to 1.0
  const weights = input.scoring_weights;
  const sum = weights.skills + weights.experience + weights.education + weights.cultural_fit;
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new AppError('INVALID_WEIGHTS', 'Scoring weights must sum to 1.0');
  }

  const job = await JobModel.create(input);
  return job;
}

export async function getJobById(jobId: string): Promise<Job | null> {
  const job = await JobModel.findOne({ _id: jobId, is_deleted: false }).lean();
  return job;
}

export async function listJobs(limit = 20, offset = 0): Promise<{ jobs: Job[]; total: number }> {
  const total = await JobModel.countDocuments({ is_deleted: false });
  const jobs = await JobModel.find({ is_deleted: false }).limit(limit).skip(offset).lean();
  return { jobs, total };
}

export async function updateJob(jobId: string, updates: Partial<CreateJobInput>): Promise<Job> {
  if (updates.scoring_weights) {
    const existingRun = await ScreeningRunModel.exists({ job_id: jobId });
    if (existingRun) {
      throw new AppError(
        'WEIGHTS_LOCKED',
        'Scoring weights cannot be changed after a screening run exists',
        409
      );
    }
    const sum =
      updates.scoring_weights.skills +
      updates.scoring_weights.experience +
      updates.scoring_weights.education +
      updates.scoring_weights.cultural_fit;
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new AppError('INVALID_WEIGHTS', 'Scoring weights must sum to 1.0');
    }
  }

  const job = await JobModel.findOneAndUpdate(
    { _id: jobId, is_deleted: false },
    updates,
    { new: true }
  );
  if (!job) {
    throw new AppError('JOB_NOT_FOUND', `Job ${jobId} not found`);
  }
  return job;
}

export async function deleteJob(jobId: string): Promise<void> {
  const job = await JobModel.findOneAndUpdate(
    { _id: jobId, is_deleted: false },
    { is_deleted: true, deleted_at: new Date() },
    { new: true }
  );
  if (!job) {
    throw new AppError('JOB_NOT_FOUND', `Job ${jobId} not found`);
  }
}
