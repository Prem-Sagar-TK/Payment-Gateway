import { Request, Response, NextFunction } from 'express';
import { idempotencyService } from '../services/idempotency.service';
import { NotFoundError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

/**
 * GET /api/v1/idempotency/records
 *
 * Lists all idempotency records in the database.
 */
export async function listAllIdempotencyRecords(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = Math.min(Number(req.query['limit']) || 50, 100);
    const offset = Number(req.query['offset']) || 0;

    const result = await idempotencyService.listAllRecords(limit, offset);
    sendSuccess(res, result.records, 200, req.requestId);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/idempotency/:key
 *
 * Returns the current state of an idempotency record for a given
 * (customerId, key) pair. Useful for debugging and the demo dashboard.
 *
 * customerId must be provided as a query param: ?customerId=cus_123
 */
export async function getIdempotencyRecord(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const key = req.params['key'] as string;
    const customerId = req.query['customerId'] as string | undefined;

    if (!customerId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CUSTOMER_ID',
          message: 'customerId query parameter is required',
        },
      });
      return;
    }

    const record = await idempotencyService.getRecord(customerId, key);
    if (!record) {
      throw new NotFoundError('IdempotencyRecord', key);
    }

    sendSuccess(res, record, 200, req.requestId);
  } catch (err) {
    next(err);
  }
}
