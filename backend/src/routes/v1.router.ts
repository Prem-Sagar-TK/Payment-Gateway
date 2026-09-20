import { Router } from 'express';
import { config } from '../config/env';
import { validate } from '../middleware/validate';
import { createChargeSchema } from '../validators/charge.validator';
import {
  createCharge,
  getCharge,
  listAllPayments,
  listCustomerCharges,
} from '../controllers/charge.controller';
import { createRefund } from '../controllers/refund.controller';
import { getIdempotencyRecord, listAllIdempotencyRecords } from '../controllers/idempotency.controller';
import { demoReset, setProviderMode, getProviderMode } from '../controllers/demo.controller';

const router = Router();

// ─── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.NODE_ENV,
  });
});

// ─── Charges & Payments ───────────────────────────────────────────────────────
router.post('/charges', validate(createChargeSchema), createCharge);
router.get('/charges/:id', getCharge);
router.post('/charges/:id/refund', createRefund);
router.get('/payments', listAllPayments);

// ─── Customers ────────────────────────────────────────────────────────────────
router.get('/customers/:customerId/charges', listCustomerCharges);

// ─── Refunds ──────────────────────────────────────────────────────────────────
router.post('/refunds/:paymentId', createRefund);

// ─── Idempotency ──────────────────────────────────────────────────────────────
router.get('/idempotency/records', listAllIdempotencyRecords);
router.get('/idempotency/:key', getIdempotencyRecord);

// ─── Demo / Admin (development only) ─────────────────────────────────────────
if (config.NODE_ENV !== 'production') {
  router.post('/demo/reset', demoReset);
  router.post('/demo/provider-mode', setProviderMode);
  router.get('/demo/provider-mode', getProviderMode);
}

export { router as v1Router };
