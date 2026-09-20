/**
 * CONCURRENCY TESTS — The most critical part of this project.
 *
 * These tests verify that the database-level idempotency guarantee holds
 * under simultaneous concurrent requests. Each test fires N requests in
 * parallel via Promise.all() and then directly queries PostgreSQL to
 * verify that exactly one payment record was created.
 *
 * NO application-level sequential processing is used. Requests genuinely
 * execute concurrently.
 */

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

/**
 * Helper: fire N concurrent requests with the same payload and key.
 */
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

// ─── 10 Concurrent Identical Requests ────────────────────────────────────────
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

    // All responses should be HTTP 200
    const successfulResponses = responses.filter((r) => r.status === 200);
    // Some may be 409 (PAYMENT_IN_PROGRESS) — that's correct behavior
    const conflictResponses = responses.filter((r) => r.status === 409);

    console.log(`\n  10-concurrent: ${successfulResponses.length} success, ${conflictResponses.length} in-progress`);

    // At least one must succeed
    expect(successfulResponses.length).toBeGreaterThanOrEqual(1);

    // Total responses = 10 (no dropped requests)
    expect(responses.length).toBe(10);

    // ── CRITICAL DATABASE ASSERTION ──────────────────────────────────────────
    const payments = await testPrisma.payment.findMany({
      where: { customerId: 'cus_concurrent_10' },
    });

    console.log(`  DB payment count: ${payments.length} (expected: 1)`);
    expect(payments.length).toBe(1);

    // All successful responses reference the same payment ID
    const paymentIds = new Set(
      successfulResponses.map((r) => r.body.data?.id).filter(Boolean),
    );
    expect(paymentIds.size).toBe(1);
  }, 30_000);
});

// ─── 100 Concurrent Identical Requests ───────────────────────────────────────
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

    // Total responses = 100
    expect(responses.length).toBe(100);

    // ── CRITICAL: Exactly 1 payment in the database ──────────────────────────
    const payments = await testPrisma.payment.findMany({
      where: { customerId: 'cus_concurrent_100' },
    });

    console.log(`    DB payment count: ${payments.length} (MUST be 1)`);
    expect(payments.length).toBe(1);

    // Idempotency records: exactly 1 for this key
    const idempotencyRecords = await testPrisma.idempotencyRecord.findMany({
      where: { customerId: 'cus_concurrent_100', key },
    });
    expect(idempotencyRecords.length).toBe(1);

    // No duplicate providerReferences
    const providerRefs = new Set(payments.map((p) => p.providerReference));
    expect(providerRefs.size).toBe(1);
  }, 60_000);
});

// ─── 100 Concurrent Requests — 100 Different Keys → 100 Payments ─────────────
describe('100 concurrent requests — 100 different idempotency keys', () => {
  it('should create exactly 100 unique payments', async () => {
    const customerId = 'cus_concurrent_100_unique';
    const payload = {
      amount: 1000,
      currency: 'INR',
      customerId,
    };

    // Each request uses a unique key → should create 100 distinct payments
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

    // ── CRITICAL: 100 payments in the database ───────────────────────────────
    const payments = await testPrisma.payment.findMany({
      where: { customerId },
    });

    console.log(`    DB payment count: ${payments.length} (MUST be 100)`);
    expect(payments.length).toBe(100);

    // All payment IDs should be unique
    const ids = new Set(payments.map((p) => p.id));
    expect(ids.size).toBe(100);
  }, 60_000);
});

// ─── Mixed: Multiple customers, same keys ────────────────────────────────────
describe('Multiple customers with the same idempotency key', () => {
  it('should create one payment per customer (scoped by customerId)', async () => {
    const key = 'shared-key-across-customers';
    const customers = ['cus_A', 'cus_B', 'cus_C'];

    // Each customer fires 5 requests with the same key
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

    // Exactly 3 payments should exist (one per customer)
    const payments = await testPrisma.payment.findMany({
      where: { customerId: { in: customers } },
    });

    console.log(`    DB payment count: ${payments.length} (MUST be 3)`);
    expect(payments.length).toBe(3);

    // One per customer
    const customerIds = new Set(payments.map((p) => p.customerId));
    expect(customerIds.size).toBe(3);
  }, 30_000);
});
