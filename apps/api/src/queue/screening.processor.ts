import { Worker } from 'bullmq';
import { runAiScreening } from '../services/ai.client.js';
import { ScreeningRunModel, JobModel, ApplicantModel, ScreeningResultModel } from '@umurava/db';
import { redisWorker } from '../lib/redis.js';
import { logger } from '../lib/logger.js';

interface ScreeningJobData {
  jobId: string;
  runId: string;
}

export const screeningWorker = new Worker<ScreeningJobData>(
  'screening',
  async (queueJob) => {
    const { runId, jobId } = queueJob.data;

    try {
      await ScreeningRunModel.findByIdAndUpdate(runId, { status: 'running' });

      // Gather payload for the Python AI service
      const [job, applicants] = await Promise.all([
        JobModel.findById(jobId).lean(),
        ApplicantModel.find({ job_id: jobId }).lean(),
      ]);

      if (!job) throw new Error(`Job ${jobId} not found`);

      await queueJob.updateProgress(10);

      // One HTTP call to Python — Python handles batching internally
      const { results } = await runAiScreening({
        run_id: runId,
        job,
        applicants: applicants.map((a) => ({
          _id: a._id,
          parsed_profile: a.parsed_profile,
        })),
      });

      await queueJob.updateProgress(90);

      // Persist ranked results
      await ScreeningResultModel.insertMany(
        results.map((r) => ({
          screening_run_id: runId,
          job_id: jobId,
          applicant_id: r.applicant_id,
          rank: r.rank,
          composite_score: r.composite_score,
          dimension_scores: r.dimension_scores,
          reasoning: {
            strengths: r.strengths,
            gaps: r.gaps,
            recommendation: r.recommendation,
          },
          model_version: 'gemini-1.5-flash',
        })),
        { ordered: false }
      );

      await ScreeningRunModel.findByIdAndUpdate(runId, {
        status: 'complete',
        completed_at: new Date(),
      });

      await queueJob.updateProgress(100);
      logger.info({ runId, count: results.length }, 'screening_complete');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err, runId }, 'screening_failed');
      await ScreeningRunModel.findByIdAndUpdate(runId, {
        status: 'failed',
        error: msg,
      });
      throw err; // let BullMQ mark the job failed
    }
  },
  { connection: redisWorker, concurrency: 2 }
);

screeningWorker.on('error', (err) => {
  logger.error({ err }, 'worker_error');
});

screeningWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'job_failed');
});
