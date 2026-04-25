import { ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        data: null,
        error: { code: 'VALIDATION_ERROR', message: result.error.errors[0]?.message },
      });
    }
    req.body = result.data;
    next();
  };
};
