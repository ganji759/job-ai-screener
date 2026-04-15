import { ScreeningRun, ScreeningRunModel, JobModel, ApplicantModel, ScreeningResultModel } from '@umurava/db';
import { screeningQueue } from '../queue/screening.queue.js';
import { AppError } from '../lib/errors.js';
import type { Job, Applicant } from '@umurava/db';

interface StartScreeningInput {
  jobId: string;
}

export async function startScreening(input: StartScreeningInput): Promise<ScreeningRun> {
  const job = await JobModel.findOne({ _id: input.jobId, is_deleted: false });
  if (!job) {
    throw new AppError('JOB_NOT_FOUND', `Job ${input.jobId} not found`);
  }

  const applicants = await ApplicantModel.find({ job_id: input.jobId }).lean();
  if (applicants.length === 0) {
    throw new AppError('NO_APPLICANTS', 'No applicants to screen for this job');
  }

  // Create screening run record
  const screeningRun = await ScreeningRunModel.create({
    job_id: input.jobId,
    status: 'pending',
    started_at: new Date(),
  });

  // Queue the screening job
  const jobData = {
    jobId: input.jobId,
    runId: screeningRun._id.toString(),
    applicantIds: applicants.map((a) => a._id.toString()),
    jobCriteria: job,
    scoringWeights: job.scoring_weights,
  };

  const queueJob = await screeningQueue.add('screening', jobData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  // Store queue job ID for progress tracking
  await ScreeningRunModel.findByIdAndUpdate(screeningRun._id, {
    queue_job_id: queueJob.id,
  });

  return screeningRun;
}

export async function getScreeningStatus(runId: string): Promise<{
  status: string;
  progress: number;
  error?: string;
} | null> {
  const run = await ScreeningRunModel.findById(runId).lean();
  if (!run) {
    return null;
  }

  let progress = 0;
  if (run.queue_job_id) {
    const job = await screeningQueue.getJob(run.queue_job_id);
    if (job) {
      progress = typeof job.progress === 'number' ? job.progress : 0;
    }
  }

  return {
    status: run.status,
    progress,
    error: run.error,
  };
}

export async function getScreeningResults(runId: string): Promise<{
  ranked: Array<{
    rank: number;
    applicant: Applicant;
    composite_score: number;
    dimension_scores: {
      skills: number;
      experience: number;
      education: number;
      cultural_fit: number;
    };
    strengths: string[];
    gaps: string[];
    recommendation: string;
  }>;
} | null> {
  const run = await ScreeningRunModel.findById(runId);
  if (!run) {
    return null;
  }

  if (run.status !== 'complete') {
    throw new AppError('SCREENING_NOT_COMPLETE', 'Screening is not yet complete');
  }

  const results = await ScreeningResultModel.find({ screening_run_id: runId })
    .sort({ rank: 1 })
    .populate('applicant_id')
    .lean();

  const ranked = results.map((r, idx: number) => ({
    rank: idx + 1,
    applicant: r.applicant_id as Applicant,
    composite_score: r.composite_score,
    dimension_scores: r.dimension_scores,
    strengths: r.reasoning.strengths,
    gaps: r.reasoning.gaps,
    recommendation: r.reasoning.recommendation,
  }));

  return { ranked };
}
