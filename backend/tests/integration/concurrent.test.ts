process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://postgres:postgrespassword@localhost:5432/payment_gateway_test?schema=public';
process.env['LOG_LEVEL'] = 'error';
process.env['MOCK_PROVIDER_MODE'] = 'success';
process.env['MOCK_PROVIDER_LATENCY_MIN'] = '20';
process.env['MOCK_PROVIDER_LATENCY_MAX'] = '80';

import request from 'supertest';
import { createApp } from '../../src/app';
import { cleanDb, testPrisma } from '../setup/testHelpers';

const app = createApp();
const BASE_URL = '/api/v1';

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await testPrisma.$disconnect();
});

async function fireN(
  n: number,
  idempotencyKey: string,
  payload: object,
): Promise<request.Response[]> {
  return Promise.all(
    Array.from({ length: n }, () =>
      request(app)
        .post(`${BASE_URL}/charges`)
        .set('Idempotency-Key', idempotencyKey)
        .send(payload),
    ),
  );
}

describe('10 concurrent requests — same idempotency key', () => {
  it('should create exactly 1 payment and return 10 responses', async () => {
    const key = 'concurrent-10-same-key';
    const payload = {
      amount: 4999,
      currency: 'INR',
      customerId: 'cus_concurrent_10',
      description: 'Concurrent test',
    };

    const responses = await fireN(10, key, payload);

    const successfulResponses = responses.filter((r) => r.status === 200);

    const conflictResponses = responses.filter((r) => r.status === 409);

    console.log(`\n  10-concurrent: ${successfulResponses.length} success, ${conflictResponses.length} in-progress`);

    expect(successfulResponses.length).toBeGreaterThanOrEqual(1);

    expect(responses.length).toBe(10);

    const payments = await testPrisma.payment.findMany({
      where: { customerId: 'cus_concurrent_10' },
    });

    console.log(`  DB payment count: ${payments.length} (expected: 1)`);
    expect(payments.length).toBe(1);

    const paymentIds = new Set(
      successfulResponses.map((r) => r.body.data?.id).filter(Boolean),
    );
    expect(paymentIds.size).toBe(1);
  }, 30_000);
});

describe('100 concurrent requests — same idempotency key', () => {
  it('should create exactly 1 payment out of 100 concurrent requests', async () => {
    const key = 'concurrent-100-same-key';
    const payload = {
      amount: 9999,
      currency: 'INR',
      customerId: 'cus_concurrent_100',
      description: 'Stress test',
    };

    const responses = await fireN(100, key, payload);

    const successfulResponses = responses.filter((r) => r.status === 200);
    const conflictResponses = responses.filter((r) => r.status === 409);
    const otherResponses = responses.filter(
      (r) => r.status !== 200 && r.status !== 409,
    );

    console.log(`\n  100-concurrent:`);
    console.log(`    200 OK:    ${successfulResponses.length}`);
    console.log(`    409 Conflict: ${conflictResponses.length}`);
    console.log(`    Other:    ${otherResponses.length}`);

    expect(responses.length).toBe(100);

    const payments = await testPrisma.payment.findMany({
      where: { customerId: 'cus_concurrent_100' },
    });

    console.log(`    DB payment count: ${payments.length} (MUST be 1)`);
    expect(payments.length).toBe(1);

    const idempotencyRecords = await testPrisma.idempotencyRecord.findMany({
      where: { customerId: 'cus_concurrent_100', key },
    });
    expect(idempotencyRecords.length).toBe(1);

    const providerRefs = new Set(payments.map((p) => p.providerReference));
    expect(providerRefs.size).toBe(1);
  }, 60_000);
});

describe('100 concurrent requests — 100 different idempotency keys', () => {
  it('should create exactly 100 unique payments', async () => {
    const customerId = 'cus_concurrent_100_unique';
    const payload = {
      amount: 1000,
      currency: 'INR',
      customerId,
    };

    const responses = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        request(app)
          .post(`${BASE_URL}/charges`)
          .set('Idempotency-Key', `unique-key-${i}-${Date.now()}`)
          .send(payload),
      ),
    );

    const successful = responses.filter((r) => r.status === 200);

    console.log(`\n  100-unique-keys: ${successful.length} successful`);

    expect(successful.length).toBe(100);

    const payments = await testPrisma.payment.findMany({
      where: { customerId },
    });

    console.log(`    DB payment count: ${payments.length} (MUST be 100)`);
    expect(payments.length).toBe(100);

    const ids = new Set(payments.map((p) => p.id));
    expect(ids.size).toBe(100);
  }, 60_000);
});

describe('Multiple customers with the same idempotency key', () => {
  it('should create one payment per customer (scoped by customerId)', async () => {
    const key = 'shared-key-across-customers';
    const customers = ['cus_A', 'cus_B', 'cus_C'];

    const allResponses = await Promise.all(
      customers.flatMap((customerId) =>
        Array.from({ length: 5 }, () =>
          request(app)
            .post(`${BASE_URL}/charges`)
            .set('Idempotency-Key', key)
            .send({ amount: 500, currency: 'INR', customerId }),
        ),
      ),
    );

    const successful = allResponses.filter((r) => r.status === 200);

    console.log(`\n  Multi-customer: ${successful.length} successful responses`);

    const payments = await testPrisma.payment.findMany({
      where: { customerId: { in: customers } },
    });

    console.log(`    DB payment count: ${payments.length} (MUST be 3)`);
    expect(payments.length).toBe(3);

    const customerIds = new Set(payments.map((p) => p.customerId));
    expect(customerIds.size).toBe(3);
  }, 30_000);
});
