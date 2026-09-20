import { createHash } from 'crypto';

/**
 * Generates a deterministic SHA-256 hash from the canonical payment request fields.
 *
 * The hash is used to detect when a caller reuses an idempotency key with a
 * DIFFERENT request body (e.g. changed amount). In that case we return 409.
 *
 * Only the semantically-meaningful fields are hashed — NOT the description,
 * because small cosmetic changes should not invalidate a key.
 * Adjust the included fields to match your business rules.
 */
export function hashRequest(payload: {
  amount: number;
  currency: string;
  customerId: string;
}): string {
  // Normalise currency to upper-case so "inr" and "INR" hash identically.
  const canonical = JSON.stringify({
    amount: payload.amount,
    currency: payload.currency.toUpperCase(),
    customerId: payload.customerId,
  });

  return createHash('sha256').update(canonical).digest('hex');
}
