import { createHash } from 'crypto';

export function hashRequest(payload: {
  amount: number;
  currency: string;
  customerId: string;
}): string {

  const canonical = JSON.stringify({
    amount: payload.amount,
    currency: payload.currency.toUpperCase(),
    customerId: payload.customerId,
  });

  return createHash('sha256').update(canonical).digest('hex');
}
