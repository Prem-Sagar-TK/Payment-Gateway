import { Request, Response, NextFunction } from 'express';
import { payrollService } from '../services/payroll.service';

export async function processPayroll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, employeeIds } = req.body;
    const result = await payrollService.processPayroll(
      { title, employeeIds: employeeIds || [] },
      req.requestId,
    );

    res.status(200).json({
      success: true,
      data: result,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}

export async function listPayrollBatches(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const result = await payrollService.listPayrollBatches(limit, offset);

    res.status(200).json({
      success: true,
      data: result.batches,
      meta: {
        total: result.total,
        limit,
        offset,
        requestId: req.requestId,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getPayrollBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const batch = await payrollService.getPayrollBatchById(req.params.id);
    res.status(200).json({
      success: true,
      data: batch,
      meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
    });
  } catch (err) {
    next(err);
  }
}
