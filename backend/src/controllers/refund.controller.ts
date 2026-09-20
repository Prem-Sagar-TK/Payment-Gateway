import { Request, Response, NextFunction } from 'express';
import { paymentService } from '../services/payment.service';
import { sendSuccess } from '../utils/response';

/**
 * POST /api/v1/refunds/:paymentId
 *
 * Issues a mock refund against an existing succeeded payment.
 * Refunds are fire-and-forget in this mock implementation.
 * In production, refunds would also use idempotency keys.
 */
export async function createRefund(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { paymentId } = req.params as { paymentId: string };
    const result = await paymentService.createRefund(paymentId, req.requestId);
    sendSuccess(res, result, 200, req.requestId);
  } catch (err) {
    next(err);
  }
}
