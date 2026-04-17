import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';

export const screeningQueue = new Queue('screening', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
    },
  },
});
