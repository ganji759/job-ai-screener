import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      data: null,
      error: { code: err.code, message: err.message },
    });
  }

  if (err instanceof Error) {
    logger.error(err);
    return res.status(500).json({
      data: null,
      error: { code: 'INTERNAL', message: 'Server error' },
    });
  }

  logger.error('Unknown error:', err);
  return res.status(500).json({
    data: null,
    error: { code: 'INTERNAL', message: 'Server error' },
  });
};
