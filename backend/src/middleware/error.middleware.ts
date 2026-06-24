// SmartCat Feeder - Error Middleware
// Catches unhandled errors and returns clean JSON responses.

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

/**
 * Global Express error handler. Always place this LAST in app middleware chain.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation error',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Known Error objects
  if (err instanceof Error) {
    logger.error(`Unhandled error on ${req.method} ${req.path}: ${err.message}`, { stack: err.stack });

    // Custom error codes
    const statusMatch = err.message.match(/^(\d{3}): (.+)$/);
    if (statusMatch) {
      res.status(parseInt(statusMatch[1], 10)).json({ error: statusMatch[2] });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
    return;
  }

  logger.error('Unknown error type thrown', { err });
  res.status(500).json({ error: 'Internal server error' });
}
