import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import mongoose from 'mongoose';
import { errorHandler } from './middleware/error.js';
import { jobsRouter } from './routes/jobs.js';
import { applicantsRouter } from './routes/applicants.js';
import { screeningsRouter, jobScreeningsRouter } from './routes/screenings.js';
import { logger } from './lib/logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(pinoHttp({ logger }));
app.use(express.json({ limit: '10mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({
    data: { status: 'ok', timestamp: new Date().toISOString() },
    error: null,
  });
});

// API Routes
app.use('/api/jobs', jobsRouter);
app.use('/api/jobs/:jobId/applicants', applicantsRouter);
app.use('/api/jobs/:jobId/screenings', jobScreeningsRouter);
app.use('/api/screenings', screeningsRouter);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    data: null,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
    meta: {},
  });
});

// Start server
async function start() {
  try {
    // Connect to MongoDB
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    } else {
      logger.warn('MONGODB_URI not set - running without database');
    }

    app.listen(PORT, () => {
      logger.info(`API server listening on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app };
