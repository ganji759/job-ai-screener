import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';

export const screeningQueue = new Queue('screening', {
  connection: redis,
});
