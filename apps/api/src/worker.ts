import mongoose from 'mongoose';
import { screeningWorker } from './queue/screening.processor.js';
import { logger } from './lib/logger.js';
import { redis } from './lib/redis.js';

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
    logger.info(`Redis connection: ${redis.options.host ?? 'localhost'}:${redis.options.port ?? 6379}`);

    // Keep the worker running
    process.on('SIGINT', async () => {
      logger.info('Shutting down worker...');
      await screeningWorker.close();
      await redis.quit();
      await mongoose.disconnect();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
}

start();
