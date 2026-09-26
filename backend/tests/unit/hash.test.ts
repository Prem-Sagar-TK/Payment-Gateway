process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] =
  process.env['TEST_DATABASE_URL'] ??
  'postgresql://postgres:postgrespassword@localhost:5432/payment_gateway_test?schema=public';
process.env['LOG_LEVEL'] = 'error';

import { hashRequest } from '../../src/utils/hash';

describe('hashRequest', () => {
  it('should produce the same hash for identical inputs', () => {
    const hash1 = hashRequest({ amount: 4999, currency: 'INR', customerId: 'cus_123' });
    const hash2 = hashRequest({ amount: 4999, currency: 'INR', customerId: 'cus_123' });
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different amounts', () => {
    const hash1 = hashRequest({ amount: 4999, currency: 'INR', customerId: 'cus_123' });
    const hash2 = hashRequest({ amount: 5000, currency: 'INR', customerId: 'cus_123' });
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hashes for different currencies', () => {
    const hash1 = hashRequest({ amount: 4999, currency: 'INR', customerId: 'cus_123' });
    const hash2 = hashRequest({ amount: 4999, currency: 'USD', customerId: 'cus_123' });
    expect(hash1).not.toBe(hash2);
  });

  it('should produce different hashes for different customers', () => {
    const hash1 = hashRequest({ amount: 4999, currency: 'INR', customerId: 'cus_123' });
    const hash2 = hashRequest({ amount: 4999, currency: 'INR', customerId: 'cus_456' });
    expect(hash1).not.toBe(hash2);
  });

  it('should normalise currency to uppercase', () => {
    const hashLower = hashRequest({ amount: 4999, currency: 'inr', customerId: 'cus_123' });
    const hashUpper = hashRequest({ amount: 4999, currency: 'INR', customerId: 'cus_123' });
    expect(hashLower).toBe(hashUpper);
  });

  it('should produce a 64-character hex string (SHA-256)', () => {
    const hash = hashRequest({ amount: 100, currency: 'USD', customerId: 'cus_abc' });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('should be deterministic across multiple invocations', () => {
    const results = Array.from({ length: 10 }, () =>
      hashRequest({ amount: 1000, currency: 'EUR', customerId: 'cus_xyz' }),
    );
    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});
