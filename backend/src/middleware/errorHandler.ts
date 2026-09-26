import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { isAppError } from '../utils/errors';
import { sendError } from '../utils/response';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,

  _next: NextFunction,
): void {
  if (isAppError(err)) {

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

  logger.error('Unhandled error', {
    requestId: req.requestId,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });

  sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred', undefined, req.requestId);
}
