import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Attaches a unique requestId to every inbound request.
 * Used in structured logs to trace a single request across log lines.
 */
export function requestIdMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  req.requestId = (req.headers['x-request-id'] as string) ?? uuidv4();
  next();
}
