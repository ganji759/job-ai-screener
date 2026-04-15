import { Worker, Job } from 'bullmq';
import { runScreening } from '@umurava/ai';
import { ScreeningRunModel, JobModel, ApplicantModel, ScreeningResultModel } from '@umurava/db';
import { redis } from '../lib/redis.js';
import { logger } from '../lib/logger.js';
import type { Job as JobType } from '@umurava/db';

interface ScreeningJobData {
  jobId: string;
  runId: string;
  applicantIds: string[];
  jobCriteria: JobType;
  scoringWeights: {
    skills: number;
    experience: number;
    education: number;
    cultural_fit: number;
  };
}

export const screeningWorker = new Worker<ScreeningJobData>(
  'screening',
  async (job) => {
    const { runId, applicantIds, jobCriteria, scoringWeights } = job.data;

    logger.info(`Starting screening run ${runId} for job ${jobCriteria._id}`);

    await ScreeningRunModel.findByIdAndUpdate(runId, { status: 'running' });

    const applicants = await ApplicantModel.find({
      _id: { $in: applicantIds },
    }).lean();

    try {
      const results = await runScreening({
        job: jobCriteria,
        applicants,
        runId,
        onBatchComplete: async (batchIdx, total) => {
          const progress = Math.round((batchIdx / total) * 100);
          await job.updateProgress(progress);
          logger.info(`Screening ${runId}: batch ${batchIdx}/${total} (${progress}%)`);
        },
      });

      // Persist results to DB
      await ScreeningResultModel.insertMany(results);

      await ScreeningRunModel.findByIdAndUpdate(runId, {
        status: 'complete',
        completed_at: new Date(),
      });

      logger.info(`Screening run ${runId} completed successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Screening run ${runId} failed:`, errorMessage);

      await ScreeningRunModel.findByIdAndUpdate(runId, {
        status: 'failed',
        error: errorMessage,
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 3,
  }
);

screeningWorker.on('error', (err) => {
  logger.error('Worker error:', err);
});

screeningWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err.message);
});
