import { Payment, PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { mockProvider } from './mock-provider.service';
import { idempotencyService } from './idempotency.service';
import { hashRequest } from '../utils/hash';
import { NotFoundError } from '../utils/errors';
import { CreateChargeInput, PaymentResponse, RefundResponse } from '../types';

/**
 * PaymentService
 *
 * Orchestrates the full charge lifecycle:
 *
 *  1. Hash the request payload.
 *  2. Attempt to claim the idempotency key (delegates to IdempotencyService).
 *  3. If this is a replay → return stored response immediately.
 *  4. If this is the first request:
 *       a. Create a PENDING payment record.
 *       b. Call the mock payment provider.
 *       c. Update payment + idempotency record with the result.
 *       d. Return the final payment response.
 */
export class PaymentService {
  /**
   * createCharge
   *
   * Entry point for POST /api/v1/charges.
   */
  async createCharge(
    input: CreateChargeInput,
    requestId: string,
  ): Promise<PaymentResponse> {
    const { amount, currency, customerId, description, idempotencyKey } = input;

    const requestHash = hashRequest({ amount, currency, customerId });

    logger.info('Processing charge request', {
      requestId,
      customerId,
      idempotencyKey,
      amount,
      currency,
    });

    // ── Step 1: Claim the idempotency key ─────────────────────────────────────
    // This is the atomic race: only one caller wins the INSERT.
    // May throw RequestMismatchError or PaymentInProgressError.
    const { isNewRequest, record } = await idempotencyService.claimKey({
      customerId,
      key: idempotencyKey,
      requestHash,
    });

    // ── Step 2: Replay path ───────────────────────────────────────────────────
    if (!isNewRequest) {
      logger.info('Returning idempotent replay', {
        requestId,
        customerId,
        idempotencyKey,
        paymentId: record.paymentId,
        status: record.status,
      });

      // responseBody was stored as JSON — cast it back to PaymentResponse shape
      const stored = record.responseBody as unknown as PaymentResponse;
      return { ...stored, idempotent: true };
    }

    // ── Step 3: First-time processing ─────────────────────────────────────────
    let payment: Payment | undefined;

    try {
      // Create a PENDING payment row immediately.
      // This gives us a payment ID to reference in the idempotency record.
      payment = await prisma.payment.create({
        data: {
          customerId,
          idempotencyKey,
          amount,
          currency: currency.toUpperCase(),
          description,
          status: PaymentStatus.PENDING,
        },
      });

      logger.debug('Payment record created (PENDING)', {
        requestId,
        paymentId: payment.id,
      });

      // ── Step 4: Call the payment provider ──────────────────────────────────
      const providerResult = await mockProvider.createCharge({
        amount,
        currency,
        customerId,
        description,
      });

      // ── Step 5: Update payment record with provider result ─────────────────
      const finalStatus =
        providerResult.status === 'succeeded' ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: finalStatus,
          providerReference: providerResult.providerReference,
          failureReason: providerResult.failureReason ?? null,
        },
      });

      // ── Step 6: Build the response ─────────────────────────────────────────
      const response: PaymentResponse = {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        customerId: payment.customerId,
        description: payment.description,
        status: payment.status,
        providerReference: payment.providerReference,
        failureReason: payment.failureReason,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        idempotent: false,
      };

      // ── Step 7: Persist the result in the idempotency record ───────────────
      if (finalStatus === PaymentStatus.SUCCEEDED) {
        await idempotencyService.markSucceeded({
          customerId,
          key: idempotencyKey,
          paymentId: payment.id,
          responseBody: JSON.parse(JSON.stringify(response)),
        });
      } else {
        await idempotencyService.markFailed({
          customerId,
          key: idempotencyKey,
          responseBody: JSON.parse(JSON.stringify(response)),
        });
      }

      logger.info('Charge processed', {
        requestId,
        paymentId: payment.id,
        status: finalStatus,
        providerReference: providerResult.providerReference,
        customerId,
        idempotencyKey,
      });

      return response;

    } catch (err) {
      // ── Error path: mark idempotency record as FAILED ─────────────────────
      // This ensures subsequent retries receive a deterministic FAILED response
      // rather than hanging in PROCESSING forever.
      logger.error('Charge processing error', {
        requestId,
        customerId,
        idempotencyKey,
        error: err instanceof Error ? err.message : String(err),
      });

      const failureResponse: PaymentResponse = {
        id: payment?.id ?? 'unknown',
        amount,
        currency: currency.toUpperCase(),
        customerId,
        description,
        status: PaymentStatus.FAILED,
        providerReference: null,
        failureReason: err instanceof Error ? err.message : 'Unknown error',
        createdAt: payment?.createdAt ?? new Date(),
        updatedAt: new Date(),
        idempotent: false,
      };

      // Best-effort: mark idempotency record as failed so retries get a replay
      await idempotencyService
        .markFailed({
          customerId,
          key: idempotencyKey,
          responseBody: JSON.parse(JSON.stringify(failureResponse)),
        })
        .catch((markErr: unknown) =>
          logger.error('Failed to mark idempotency record as FAILED', { error: markErr }),
        );

      // Also update payment status if the record was created
      if (payment?.id) {
        await prisma.payment
          .update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.FAILED,
              failureReason: err instanceof Error ? err.message : 'Unknown error',
            },
          })
          .catch((updateErr: unknown) =>
            logger.error('Failed to update payment to FAILED', { error: updateErr }),
          );
      }

      return failureResponse;
    }
  }

  /**
   * getPaymentById
   *
   * Fetches a payment by its internal ID.
   */
  async getPaymentById(paymentId: string): Promise<PaymentResponse> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment', paymentId);
    return this.toResponse(payment);
  }

  /**
   * listAllPayments
   *
   * Lists all payments across all customers, newest first.
   */
  async listAllPayments(
    limit = 50,
    offset = 0,
  ): Promise<{ payments: PaymentResponse[]; total: number }> {
    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count(),
    ]);

    return { payments: payments.map((p) => this.toResponse(p)), total };
  }

  /**
   * getPaymentsByCustomer
   *
   * Lists all payments for a customer, newest first.
   */
  async getPaymentsByCustomer(
    customerId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ payments: PaymentResponse[]; total: number }> {
    const [payments, total] = await prisma.$transaction([
      prisma.payment.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.payment.count({ where: { customerId } }),
    ]);

    return { payments: payments.map((p) => this.toResponse(p)), total };
  }

  /**
   * createRefund
   *
   * Issues a mock refund for a succeeded payment.
   */
  async createRefund(paymentId: string, requestId: string): Promise<RefundResponse> {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError('Payment', paymentId);

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new Error(`Cannot refund a payment with status ${payment.status}`);
    }

    if (!payment.providerReference) {
      throw new Error('Payment has no provider reference — cannot refund');
    }

    logger.info('Processing refund', { requestId, paymentId, customerId: payment.customerId });

    const refundResult = await mockProvider.createRefund({
      providerReference: payment.providerReference,
      amount: payment.amount,
    });

    return {
      paymentId: payment.id,
      refundReference: refundResult.refundReference,
      amount: payment.amount,
      currency: payment.currency,
      status: refundResult.status === 'succeeded' ? 'SUCCEEDED' : 'FAILED',
      createdAt: new Date(),
    };
  }

  private toResponse(p: Payment): PaymentResponse {
    return {
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      customerId: p.customerId,
      description: p.description,
      status: p.status,
      providerReference: p.providerReference,
      failureReason: p.failureReason,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      idempotent: false,
    };
  }
}

export const paymentService = new PaymentService();
