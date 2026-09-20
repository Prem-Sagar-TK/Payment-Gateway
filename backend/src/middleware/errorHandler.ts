import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { isAppError } from '../utils/errors';
import { sendError } from '../utils/response';

/**
 * Global error handler — must be registered last in the Express middleware chain.
 *
 * Converts AppError instances to structured JSON responses.
 * Logs unexpected errors without leaking internals to the client.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (isAppError(err)) {
    // Known application error — log at appropriate level
    if (err.statusCode >= 500) {
      logger.error('Application error', {
        requestId: req.requestId,
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      });
    } else {
      logger.info('Client error', {
        requestId: req.requestId,
        code: err.code,
        message: err.message,
        statusCode: err.statusCode,
      });
    }

    sendError(res, err.statusCode, err.code, err.message, err.details, req.requestId);
    return;
  }

  // Unknown / unexpected error
  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred', undefined, req.requestId);
}
