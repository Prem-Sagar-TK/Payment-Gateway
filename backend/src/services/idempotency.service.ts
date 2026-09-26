import { IdempotencyRecord, IdempotencyStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import {
  PaymentInProgressError,
  RequestMismatchError,
  getPrismaErrorCode,
} from '../utils/errors';

const PRISMA_UNIQUE_VIOLATION = 'P2002';

export interface ClaimResult {

  isNewRequest: boolean;
  record: IdempotencyRecord;
}

export class IdempotencyService {

  async claimKey(params: {
    customerId: string;
    key: string;
    requestHash: string;
  }): Promise<ClaimResult> {
    const { customerId, key, requestHash } = params;

    try {

      const record = await prisma.idempotencyRecord.create({
        data: { customerId, key, requestHash, status: IdempotencyStatus.PROCESSING },
      });

      logger.debug('Idempotency key claimed (new request)', { customerId, key });
      return { isNewRequest: true, record };

    } catch (err: unknown) {
      if (getPrismaErrorCode(err) !== PRISMA_UNIQUE_VIOLATION) {

        throw err;
      }

      const existing = await prisma.idempotencyRecord.findUnique({
        where: { customerId_key: { customerId, key } },
      });

      if (!existing) {

        logger.warn('Idempotency record disappeared between INSERT and SELECT', { key });
        return this.claimKey(params);
      }

      if (existing.requestHash !== requestHash) {
        logger.warn('Idempotency key reused with different request body', {
          customerId,
          key,
          storedHash: existing.requestHash,
          incomingHash: requestHash,
        });
        throw new RequestMismatchError();
      }

      if (existing.status === IdempotencyStatus.PROCESSING) {
        logger.info('Duplicate request while payment in-flight', { customerId, key });
        throw new PaymentInProgressError();
      }

      logger.info('Replaying idempotent response', {
        customerId,
        key,
        status: existing.status,
        paymentId: existing.paymentId,
      });

      prisma.idempotencyRecord
        .update({
          where: { customerId_key: { customerId, key } },
          data: { replayCount: { increment: 1 } },
        })
        .catch((e: unknown) => logger.warn('Failed to increment replayCount', { error: e }));

      return { isNewRequest: false, record: existing };
    }
  }

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

  async listAllRecords(
    limit = 50,
    offset = 0,
  ): Promise<{ records: IdempotencyRecord[]; total: number }> {
    const [records, total] = await prisma.$transaction([
      prisma.idempotencyRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.idempotencyRecord.count(),
    ]);

    return { records, total };
  }

  async getRecord(customerId: string, key: string): Promise<IdempotencyRecord | null> {
    return prisma.idempotencyRecord.findUnique({
      where: { customerId_key: { customerId, key } },
    });
  }

  async deleteRecord(customerId: string, key: string): Promise<void> {
    await prisma.idempotencyRecord.deleteMany({
      where: { customerId, key },
    });
  }

  async reset(): Promise<{ deletedRecords: number; deletedPayments: number }> {
    const [deletedItems, deletedBatches, deletedRecords, deletedPayments] = await prisma.$transaction([
      prisma.payrollItem.deleteMany(),
      prisma.payrollBatch.deleteMany(),
      prisma.idempotencyRecord.deleteMany(),
      prisma.payment.deleteMany(),
    ]);

    await prisma.employee.updateMany({
      data: {
        paymentStatus: 'PENDING',
        lastPaymentDate: null,
        lastPaymentAmount: null,
      },
    });

    return {
      deletedRecords: deletedRecords.count,
      deletedPayments: deletedPayments.count,
    };
  }
}

export const idempotencyService = new IdempotencyService();

