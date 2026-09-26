import { Router } from 'express';
import { config } from '../config/env';
import { validate } from '../middleware/validate';
import { createChargeSchema } from '../validators/charge.validator';
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  processPayrollSchema,
} from '../validators/employee.validator';
import {
  createCharge,
  getCharge,
  listAllPayments,
  listCustomerCharges,
} from '../controllers/charge.controller';
import { createRefund } from '../controllers/refund.controller';
import { getIdempotencyRecord, listAllIdempotencyRecords } from '../controllers/idempotency.controller';
import { demoReset, setProviderMode, getProviderMode } from '../controllers/demo.controller';
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  bulkImportEmployees,
} from '../controllers/employee.controller';
import {
  processPayroll,
  listPayrollBatches,
  getPayrollBatch,
} from '../controllers/payroll.controller';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.NODE_ENV,
  });
});

router.post('/charges', validate(createChargeSchema), createCharge);
router.get('/charges/:id', getCharge);
router.post('/charges/:id/refund', createRefund);
router.get('/payments', listAllPayments);

router.get('/customers/:customerId/charges', listCustomerCharges);

router.post('/refunds/:paymentId', createRefund);

router.get('/idempotency/records', listAllIdempotencyRecords);
router.get('/idempotency/:key', getIdempotencyRecord);

router.get('/employees', listEmployees);
router.post('/employees', validate(createEmployeeSchema), createEmployee);
router.post('/employees/bulk', bulkImportEmployees);
router.get('/employees/:id', getEmployee);
router.put('/employees/:id', validate(updateEmployeeSchema), updateEmployee);
router.delete('/employees/:id', deleteEmployee);

router.post('/payroll/process', validate(processPayrollSchema), processPayroll);
router.get('/payroll/batches', listPayrollBatches);
router.get('/payroll/batches/:id', getPayrollBatch);

if (config.NODE_ENV !== 'production') {
  router.post('/demo/reset', demoReset);
  router.post('/demo/provider-mode', setProviderMode);
  router.get('/demo/provider-mode', getProviderMode);
}

export { router as v1Router };

