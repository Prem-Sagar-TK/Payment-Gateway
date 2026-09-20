/**
 * Unit tests for Zod validation schemas.
 */

process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://postgres:postgrespassword@localhost:5432/payment_gateway_test?schema=public';
process.env['LOG_LEVEL'] = 'error';

import { createChargeSchema, idempotencyKeySchema } from '../../src/validators/charge.validator';

describe('createChargeSchema', () => {
  const valid = {
    amount: 4999,
    currency: 'INR',
    customerId: 'cus_123',
    description: 'Test payment',
  };

  it('should accept valid input', () => {
    expect(createChargeSchema.safeParse(valid).success).toBe(true);
  });

  it('should reject non-integer amount', () => {
    const result = createChargeSchema.safeParse({ ...valid, amount: 49.99 });
    expect(result.success).toBe(false);
  });

  it('should reject negative amount', () => {
    const result = createChargeSchema.safeParse({ ...valid, amount: -100 });
    expect(result.success).toBe(false);
  });

  it('should reject zero amount', () => {
    const result = createChargeSchema.safeParse({ ...valid, amount: 0 });
    expect(result.success).toBe(false);
  });

  it('should reject unsupported currency', () => {
    const result = createChargeSchema.safeParse({ ...valid, currency: 'XYZ' });
    expect(result.success).toBe(false);
  });

  it('should accept currency in lowercase (normalised to upper)', () => {
    const result = createChargeSchema.safeParse({ ...valid, currency: 'inr' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('INR');
    }
  });

  it('should reject empty customerId', () => {
    const result = createChargeSchema.safeParse({ ...valid, customerId: '' });
    expect(result.success).toBe(false);
  });

  it('should reject customerId with invalid characters', () => {
    const result = createChargeSchema.safeParse({ ...valid, customerId: 'cus 123!' });
    expect(result.success).toBe(false);
  });

  it('should accept input without description (optional)', () => {
    const { description: _, ...noDesc } = valid;
    const result = createChargeSchema.safeParse(noDesc);
    expect(result.success).toBe(true);
  });
});

describe('idempotencyKeySchema', () => {
  it('should accept valid key', () => {
    expect(idempotencyKeySchema.safeParse('order_123_payment').success).toBe(true);
  });

  it('should accept keys with dashes and dots', () => {
    expect(idempotencyKeySchema.safeParse('pay-abc.123').success).toBe(true);
  });

  it('should reject empty key', () => {
    expect(idempotencyKeySchema.safeParse('').success).toBe(false);
  });

  it('should reject key with spaces', () => {
    expect(idempotencyKeySchema.safeParse('key with spaces').success).toBe(false);
  });

  it('should reject key exceeding 255 characters', () => {
    expect(idempotencyKeySchema.safeParse('a'.repeat(256)).success).toBe(false);
  });
});
