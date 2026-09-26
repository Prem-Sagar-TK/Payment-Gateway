import { z } from 'zod';

const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'] as const;

export const createChargeSchema = z.object({
  amount: z
    .number({
      required_error: 'amount is required',
      invalid_type_error: 'amount must be a number',
    })
    .int('amount must be an integer (smallest currency unit)')
    .positive('amount must be a positive integer')
    .max(10_000_000, 'amount exceeds maximum allowed value'),

  currency: z
    .string()
    .toUpperCase()
    .refine(
      (val) => SUPPORTED_CURRENCIES.includes(val as (typeof SUPPORTED_CURRENCIES)[number]),
      { message: `currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` },
    ),

  customerId: z
    .string()
    .min(1, 'customerId is required')
    .max(255, 'customerId too long')
    .regex(/^[\w\-]+$/, 'customerId must be alphanumeric with dashes/underscores'),

  description: z
    .string()
    .max(500, 'description too long')
    .optional(),
});

export const idempotencyKeySchema = z
  .string()
  .min(1, 'Idempotency-Key must not be empty')
  .max(255, 'Idempotency-Key must not exceed 255 characters')
  .regex(
    /^[\w\-\.]+$/,
    'Idempotency-Key must contain only alphanumeric characters, dashes, underscores, or dots',
  );

export const providerModeSchema = z.object({
  mode: z.enum(['success', 'failure', 'timeout', 'random']),
});

export type CreateChargeInput = z.infer<typeof createChargeSchema>;
