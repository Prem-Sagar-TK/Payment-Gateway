import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { idempotencyService } from '../services/idempotency.service';
import { mockProvider } from '../services/mock-provider.service';
import { providerModeSchema } from '../validators/charge.validator';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../config/logger';

function requireDev(req: Request, res: Response): boolean {
  if (config.NODE_ENV === 'production') {
    sendError(res, 403, 'FORBIDDEN', 'Demo endpoints are not available in production', undefined, req.requestId);
    return false;
  }
  return true;
}

export async function demoReset(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireDev(req, res)) return;

    const result = await idempotencyService.reset();
    logger.warn('Demo reset executed', result);
    sendSuccess(res, { message: 'All records deleted', ...result }, 200, req.requestId);
  } catch (err) {
    next(err);
  }
}

export async function setProviderMode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireDev(req, res)) return;

    const result = providerModeSchema.safeParse(req.body);
    if (!result.success) {
      sendError(
        res,
        400,
        'VALIDATION_ERROR',
        'Invalid provider mode',
        result.error.errors,
        req.requestId,
      );
      return;
    }

    mockProvider.setMode(result.data.mode);
    sendSuccess(
      res,
      { mode: result.data.mode, message: `Provider mode set to: ${result.data.mode}` },
      200,
      req.requestId,
    );
  } catch (err) {
    next(err);
  }
}

export async function getProviderMode(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!requireDev(req, res)) return;
    sendSuccess(res, { mode: mockProvider.getMode() }, 200, req.requestId);
  } catch (err) {
    next(err);
  }
}
