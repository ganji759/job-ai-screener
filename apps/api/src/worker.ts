import mongoose from 'mongoose';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { screeningWorker } from './queue/screening.processor.js';
import { logger } from './lib/logger.js';
import { redis, redisWorker } from './lib/redis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
loadEnv({ path: path.resolve(__dirname, '../../../.env') });

async function start() {
  try {
    // Connect to MongoDB
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Worker connected to MongoDB');
    } else {
      logger.warn('MONGODB_URI not set - worker cannot function without database');
    }

    logger.info('Screening worker started');
    logger.info(`Redis connection: ${redisWorker.options.host ?? 'localhost'}:${redisWorker.options.port ?? 6379}`);

    // Keep the worker running
    process.on('SIGINT', async () => {
      logger.info('Shutting down worker...');
      await screeningWorker.close();
      await redis.quit();
      await redisWorker.quit();
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

start();
