import { PrismaClient } from '@prisma/client';

export const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env['TEST_DATABASE_URL'] ??
        'postgresql://postgres:postgrespassword@localhost:5432/payment_gateway_test?schema=public',
    },
  },
});

/**
 * Cleans all tables between tests.
 * Order matters: idempotency_records references payments via paymentId FK.
 */
export async function cleanDb(): Promise<void> {
  await testPrisma.idempotencyRecord.deleteMany();
  await testPrisma.payment.deleteMany();
}
