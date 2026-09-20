/**
 * Integration tests for POST /api/v1/charges
 *
 * Tests all idempotency cases against a real PostgreSQL database.
 * Run with: npm run test:integration
 *
 * Prerequisites: PostgreSQL running, test DB migrated (done in globalSetup.ts)
 */

// Set env BEFORE any module imports
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://postgres:postgrespassword@localhost:5432/payment_gateway_test?schema=public';
process.env['LOG_LEVEL'] = 'error';
process.env['MOCK_PROVIDER_MODE'] = 'success';
process.env['MOCK_PROVIDER_LATENCY_MIN'] = '10';
process.env['MOCK_PROVIDER_LATENCY_MAX'] = '50';

import request from 'supertest';
import { createApp } from '../../src/app';
import { cleanDb, testPrisma } from '../setup/testHelpers';

const app = createApp();

const BASE_URL = '/api/v1';

const defaultPayload = {
  amount: 4999,
  currency: 'INR',
  customerId: 'cus_integration_test',
  description: 'Premium subscription',
};

beforeEach(async () => {
  await cleanDb();
});

afterAll(async () => {
  await cleanDb();
  await testPrisma.$disconnect();
});

// ─── Test 1: Missing Idempotency-Key ─────────────────────────────────────────
describe('Missing Idempotency-Key', () => {
  it('should return 400 when Idempotency-Key header is absent', async () => {
    const res = await request(app)
      .post(`${BASE_URL}/charges`)
      .send(defaultPayload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_IDEMPOTENCY_KEY');
  });
});

// ─── Test 2: Input Validation ─────────────────────────────────────────────────
describe('Input Validation', () => {
  it('should return 400 for invalid amount (float)', async () => {
    const res = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', 'test-validation-float')
      .send({ ...defaultPayload, amount: 49.99 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for unsupported currency', async () => {
    const res = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', 'test-validation-currency')
      .send({ ...defaultPayload, currency: 'XYZ' });

    expect(res.status).toBe(400);
  });
});

// ─── Test 3: First Payment Request ────────────────────────────────────────────
describe('First Payment Request', () => {
  it('should create a payment and return idempotent: false', async () => {
    const res = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', 'test-first-payment')
      .send(defaultPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.idempotent).toBe(false);
    expect(res.body.data.status).toBe('SUCCEEDED');
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.providerReference).toMatch(/^ch_mock_/);

    // Verify exactly one payment in DB
    const payments = await testPrisma.payment.findMany({
      where: { customerId: defaultPayload.customerId },
    });
    expect(payments.length).toBe(1);
  });
});

// ─── Test 4: Idempotent Replay ────────────────────────────────────────────────
describe('Idempotent Replay', () => {
  it('should return the same payment on second request', async () => {
    const key = 'test-replay-key';

    const first = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send(defaultPayload);

    expect(first.status).toBe(200);
    expect(first.body.data.idempotent).toBe(false);

    const second = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send(defaultPayload);

    expect(second.status).toBe(200);
    expect(second.body.data.idempotent).toBe(true);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(second.body.data.providerReference).toBe(first.body.data.providerReference);

    // Still exactly one payment in DB
    const payments = await testPrisma.payment.findMany({
      where: { customerId: defaultPayload.customerId },
    });
    expect(payments.length).toBe(1);
  });

  it('should return the same result after 5 sequential replays', async () => {
    const key = 'test-5-replays';

    const first = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send(defaultPayload);

    expect(first.status).toBe(200);
    const originalId = first.body.data.id;

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post(`${BASE_URL}/charges`)
        .set('Idempotency-Key', key)
        .send(defaultPayload);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(originalId);
      expect(res.body.data.idempotent).toBe(true);
    }

    const count = await testPrisma.payment.count({
      where: { customerId: defaultPayload.customerId },
    });
    expect(count).toBe(1);
  });
});

// ─── Test 5: Same Key + Different Body → 409 ──────────────────────────────────
describe('Request Mismatch', () => {
  it('should return 409 when idempotency key is reused with a different amount', async () => {
    const key = 'test-mismatch-key';

    // First request
    const first = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send(defaultPayload);

    expect(first.status).toBe(200);

    // Second request with different amount
    const second = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send({ ...defaultPayload, amount: 9999 });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('REQUEST_MISMATCH');
  });

  it('should return 409 when idempotency key is reused with a different currency', async () => {
    const key = 'test-mismatch-currency';

    await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send(defaultPayload);

    const res = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send({ ...defaultPayload, currency: 'USD' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REQUEST_MISMATCH');
  });
});

// ─── Test 6: Payment Retrieval ────────────────────────────────────────────────
describe('Payment Retrieval', () => {
  it('should retrieve payment by ID', async () => {
    const key = 'test-retrieval-key';

    const created = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send(defaultPayload);

    const paymentId = created.body.data.id;

    const res = await request(app).get(`${BASE_URL}/charges/${paymentId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(paymentId);
    expect(res.body.data.amount).toBe(defaultPayload.amount);
  });

  it('should return 404 for non-existent payment', async () => {
    const res = await request(app).get(`${BASE_URL}/charges/non-existent-id`);
    expect(res.status).toBe(404);
  });

  it('should list payments by customer', async () => {
    // Create 3 payments with different keys
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post(`${BASE_URL}/charges`)
        .set('Idempotency-Key', `test-list-key-${i}`)
        .send({ ...defaultPayload, description: `Payment ${i}` });
    }

    const res = await request(app).get(
      `${BASE_URL}/customers/${defaultPayload.customerId}/charges`,
    );

    expect(res.status).toBe(200);
    expect(res.body.data.payments.length).toBe(3);
    expect(res.body.data.total).toBe(3);
  });
});

// ─── Test 7: Refund ───────────────────────────────────────────────────────────
describe('Refund', () => {
  it('should issue a refund for a succeeded payment', async () => {
    const created = await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', 'test-refund-key')
      .send(defaultPayload);

    const paymentId = created.body.data.id;

    const res = await request(app).post(`${BASE_URL}/refunds/${paymentId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('SUCCEEDED');
    expect(res.body.data.refundReference).toMatch(/^re_mock_/);
  });
});

// ─── Test 8: Idempotency Record Inspection ────────────────────────────────────
describe('Idempotency Record', () => {
  it('should be inspectable via the idempotency endpoint', async () => {
    const key = 'test-inspect-key';

    await request(app)
      .post(`${BASE_URL}/charges`)
      .set('Idempotency-Key', key)
      .send(defaultPayload);

    const res = await request(app)
      .get(`${BASE_URL}/idempotency/${key}`)
      .query({ customerId: defaultPayload.customerId });

    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe(key);
    expect(res.body.data.status).toBe('SUCCEEDED');
    expect(res.body.data.paymentId).toBeDefined();
  });
});

// ─── Test 9: Health Check ─────────────────────────────────────────────────────
describe('Health Check', () => {
  it('should return ok status', async () => {
    const res = await request(app).get(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
