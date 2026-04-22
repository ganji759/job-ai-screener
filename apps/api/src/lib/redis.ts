import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import IORedis from 'ioredis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '../../../../.env') });

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Connection for Queue (producer) - uses default retry behavior
export const redis = new IORedis(redisUrl, {
  maxRetriesPerRequest: 20,
  enableReadyCheck: true,
});

// Connection for Worker (consumer) - maxRetriesPerRequest must be null for blocking
export const redisWorker = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
