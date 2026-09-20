import { IdempotencyRecord, IdempotencyStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import {
  PaymentInProgressError,
  RequestMismatchError,
  getPrismaErrorCode,
} from '../utils/errors';

// Prisma error code for unique constraint violation
const PRISMA_UNIQUE_VIOLATION = 'P2002';

export interface ClaimResult {
  /** true = this caller is the first to claim this key and should process the payment */
  isNewRequest: boolean;
  record: IdempotencyRecord;
}

/**
 * IdempotencyService
 *
 * Enforces the "exactly once" guarantee using PostgreSQL's unique constraint
 * on (customerId, key). The algorithm:
 *
 *  1. Attempt INSERT with status=PROCESSING.
 *  2. If INSERT succeeds → this caller is the first; proceed to charge.
 *  3. If INSERT fails with P2002 (unique violation):
 *       a. Fetch the existing record.
 *       b. If requestHash differs → 409 (different payload, same key).
 *       c. If status=PROCESSING → 409 (payment in-flight, retry later).
 *       d. If status=SUCCEEDED/FAILED → return stored response (replay).
 *
 * This design is safe under unlimited concurrent requests because the database
 * serialises the competing INSERTs atomically. No application-level lock is
 * needed.
 */
export class IdempotencyService {
  /**
   * claimKey
   *
   * Atomically claims an idempotency key for a new request.
   * Returns { isNewRequest: true } when this caller won the INSERT race.
   * Returns { isNewRequest: false, record } when the key was already claimed.
   *
   * @throws RequestMismatchError   – same key, different request hash
   * @throws PaymentInProgressError – key exists but payment is still processing
   */
  async claimKey(params: {
    customerId: string;
    key: string;
    requestHash: string;
  }): Promise<ClaimResult> {
    const { customerId, key, requestHash } = params;

    try {
      // ── Critical section: atomic INSERT ────────────────────────────────────
      // Only ONE of N concurrent requests with the same (customerId, key) will
      // succeed here. All others catch the unique constraint violation below.
      const record = await prisma.idempotencyRecord.create({
        data: { customerId, key, requestHash, status: IdempotencyStatus.PROCESSING },
      });

      logger.debug('Idempotency key claimed (new request)', { customerId, key });
      return { isNewRequest: true, record };

    } catch (err: unknown) {
      if (getPrismaErrorCode(err) !== PRISMA_UNIQUE_VIOLATION) {
        // Unexpected database error — rethrow
        throw err;
      }

      // ── Unique violation: key already claimed ──────────────────────────────
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { customerId_key: { customerId, key } },
      });

      if (!existing) {
        // Extremely rare race: record was deleted between INSERT and findUnique.
        // Treat as a new request by retrying recursively (once).
        logger.warn('Idempotency record disappeared between INSERT and SELECT', { key });
        return this.claimKey(params);
      }

      // Hash mismatch → different request body using same key
      if (existing.requestHash !== requestHash) {
        logger.warn('Idempotency key reused with different request body', {
          customerId,
          key,
          storedHash: existing.requestHash,
          incomingHash: requestHash,
        });
        throw new RequestMismatchError();
      }

      // Payment is still being processed by the first caller
      if (existing.status === IdempotencyStatus.PROCESSING) {
        logger.info('Duplicate request while payment in-flight', { customerId, key });
        throw new PaymentInProgressError();
      }

      // Payment already completed — replay the stored result
      logger.info('Replaying idempotent response', {
        customerId,
        key,
        status: existing.status,
        paymentId: existing.paymentId,
      });

      // Increment replay counter (best-effort — do not fail the response if this fails)
      prisma.idempotencyRecord
        .update({
          where: { customerId_key: { customerId, key } },
          data: { replayCount: { increment: 1 } },
        })
        .catch((e: unknown) => logger.warn('Failed to increment replayCount', { error: e }));

      return { isNewRequest: false, record: existing };
    }
  }

  /**
   * markSucceeded
   *
   * Updates the idempotency record once the payment has been processed
   * successfully. Stores the response body for future replays.
   */
  async markSucceeded(params: {
    customerId: string;
    key: string;
    paymentId: string;
    responseBody: Prisma.InputJsonValue;
  }): Promise<void> {
    await prisma.idempotencyRecord.update({
      where: { customerId_key: { customerId: params.customerId, key: params.key } },
      data: {
        status: IdempotencyStatus.SUCCEEDED,
        responseStatus: 200,
        responseBody: params.responseBody,
        paymentId: params.paymentId,
      },
    });
  }

  /**
   * markFailed
   *
   * Updates the idempotency record when payment processing fails.
   * Per Stripe semantics, the failure is stored and replayed on retries
   * (client must use a new key to attempt a fresh charge).
   */
  async markFailed(params: {
    customerId: string;
    key: string;
    responseBody: Prisma.InputJsonValue;
  }): Promise<void> {
    await prisma.idempotencyRecord.update({
      where: { customerId_key: { customerId: params.customerId, key: params.key } },
      data: {
        status: IdempotencyStatus.FAILED,
        responseStatus: 422,
        responseBody: params.responseBody,
      },
    });
  }

  /**
   * getRecord
   *
   * Fetches the idempotency record for debugging/demo endpoints.
   */
  async getRecord(customerId: string, key: string): Promise<IdempotencyRecord | null> {
    return prisma.idempotencyRecord.findUnique({
      where: { customerId_key: { customerId, key } },
    });
  }

  /**
   * deleteRecord
   *
   * Deletes an idempotency record by (customerId, key). Used only by demo/reset
   * endpoints in development mode.
   */
  async deleteRecord(customerId: string, key: string): Promise<void> {
    await prisma.idempotencyRecord.deleteMany({
      where: { customerId, key },
    });
  }

  /**
   * reset
   *
   * Deletes ALL idempotency records and payments. DEVELOPMENT ONLY.
   */
  async reset(): Promise<{ deletedRecords: number; deletedPayments: number }> {
    // Order matters due to FK constraint: idempotency records reference payments
    // but we nullify paymentId first, then delete payments, then records
    // Actually the relation is reverse: IdempotencyRecord.paymentId → Payment.id
    const [deletedRecords, deletedPayments] = await prisma.$transaction([
      prisma.idempotencyRecord.deleteMany(),
      prisma.payment.deleteMany(),
    ]);

    return {
      deletedRecords: deletedRecords.count,
      deletedPayments: deletedPayments.count,
    };
  }
}

export const idempotencyService = new IdempotencyService();
