import Bull from "bull";
import { env } from "../config/env";

export interface ScreeningQueueData {
  screeningId: string;
  jobId: string;
  shortlistSize: 10 | 20;
  recruiterId: string;
}

export const screeningQueue = env.REDIS_ENABLED
  ? new Bull<ScreeningQueueData>("screening-jobs", env.REDIS_URL)
  : null;

export const addScreeningJob = async (data: ScreeningQueueData) => {
  if (!screeningQueue) {
    throw new Error("Redis queue is disabled. Set REDIS_ENABLED=true to run async screenings.");
  }
  return screeningQueue.add(data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  });
};

export const getJobStatus = async (jobId: string) => {
  if (!screeningQueue) {
    return { state: "redis_disabled", progress: 0 };
  }
  const job = await screeningQueue.getJob(jobId);
  if (!job) return { state: "not_found" };
  const state = await job.getState();
  return { state, progress: job.progress() };
};
