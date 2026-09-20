import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { idempotencyKeySchema } from '../validators/charge.validator';
import { MissingIdempotencyKeyError, ValidationError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

/**
 * POST /api/v1/charges
 *
 * Requires:
 *   - Header: Idempotency-Key
 *   - Body:   validated by charge.validator middleware before this handler runs
 */
export async function createCharge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // ── Validate Idempotency-Key header ───────────────────────────────────────
    const rawKey = req.headers['idempotency-key'] as string | undefined;

    if (!rawKey) {
      throw new MissingIdempotencyKeyError();
    }

    const keyResult = idempotencyKeySchema.safeParse(rawKey);
    if (!keyResult.success) {
      throw new ValidationError(
        'Invalid Idempotency-Key header',
        keyResult.error.errors,
      );
    }

    const idempotencyKey = keyResult.data;

    const result = await paymentService.createCharge(
      { ...req.body, idempotencyKey },
      req.requestId,
    );

    // Use 200 for both new and replayed responses.
    // The `idempotent` field in the body tells the client which case it is.
    sendSuccess(res, result, 200, req.requestId);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/charges/:id
 */
export async function getCharge(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payment = await paymentService.getPaymentById(req.params['id'] as string);
    sendSuccess(res, payment, 200, req.requestId);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/customers/:customerId/charges
 */
export async function listCustomerCharges(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { customerId } = req.params as { customerId: string };
    const limit = Math.min(Number(req.query['limit']) || 50, 100);
    const offset = Number(req.query['offset']) || 0;

    const result = await paymentService.getPaymentsByCustomer(customerId, limit, offset);
    sendSuccess(res, result, 200, req.requestId);
  } catch (err) {
    next(err);
  }
}
