import { prisma } from '../config/prisma';
import { logger } from '../config/logger';
import { paymentService } from './payment.service';
import { NotFoundError } from '../utils/errors';
import { ProcessPayrollInput, PayrollBatchResponse, PayrollItemResponse } from '../types';

export class PayrollService {

  async processPayroll(
    input: ProcessPayrollInput,
    requestId: string,
  ): Promise<PayrollBatchResponse> {
    const { title, employeeIds } = input;

    const employees = await prisma.employee.findMany({
      where: employeeIds && employeeIds.length > 0
        ? { id: { in: employeeIds } }
        : { status: 'ACTIVE' },
    });

    if (employees.length === 0) {
      throw new Error('No eligible employees selected for payroll');
    }

    const timestamp = Date.now();
    const batchNumber = `BATCH-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const batchTitle = title || `Payroll Batch ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const totalAmountSum = employees.reduce((sum, e) => sum + BigInt(e.salary), BigInt(0));

    logger.info('Initiating payroll batch execution', {
      requestId,
      batchNumber,
      employeeCount: employees.length,
      totalAmount: totalAmountSum.toString(),
    });

    const batch = await prisma.payrollBatch.create({
      data: {
        batchNumber,
        title: batchTitle,
        month,
        totalEmployees: employees.length,
        totalAmount: totalAmountSum,
        currency: employees[0]?.currency || 'INR',
        status: 'PROCESSING',
        successCount: 0,
        failedCount: 0,
      },
    });

    let successCount = 0;
    let failedCount = 0;
    const items: PayrollItemResponse[] = [];

    for (const emp of employees) {
      const idempotencyKey = `payroll_${batchNumber}_${emp.employeeId}`;

      try {
        const paymentRes = await paymentService.createCharge(
          {
            amount: emp.salary,
            currency: emp.currency,
            customerId: emp.employeeId,
            description: `Salary disbursement: ${emp.name} (${batchTitle})`,
            idempotencyKey,
          },
          requestId,
        );

        const isSuccess = paymentRes.status === 'SUCCEEDED';
        if (isSuccess) {
          successCount++;
        } else {
          failedCount++;
        }

        const item = await prisma.payrollItem.create({
          data: {
            batchId: batch.id,
            employeeId: emp.id,
            amount: emp.salary,
            currency: emp.currency,
            status: isSuccess ? 'SUCCEEDED' : 'FAILED',
            paymentId: paymentRes.id,
            idempotencyKey,
            failureReason: paymentRes.failureReason || null,
          },
        });

        await prisma.employee.update({
          where: { id: emp.id },
          data: {
            paymentStatus: isSuccess ? 'PAID' : 'FAILED',
            lastPaymentDate: new Date(),
            lastPaymentAmount: emp.salary,
          },
        });

        items.push({
          id: item.id,
          batchId: batch.id,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeCode: emp.employeeId,
          department: emp.department,
          amount: item.amount,
          currency: item.currency,
          status: item.status,
          paymentId: item.paymentId,
          idempotencyKey: item.idempotencyKey,
          failureReason: item.failureReason,
          createdAt: item.createdAt,
        });
      } catch (err: any) {
        failedCount++;
        logger.error('Error processing individual employee payroll item', {
          batchNumber,
          employeeId: emp.employeeId,
          error: err.message,
        });

        const item = await prisma.payrollItem.create({
          data: {
            batchId: batch.id,
            employeeId: emp.id,
            amount: emp.salary,
            currency: emp.currency,
            status: 'FAILED',
            idempotencyKey,
            failureReason: err.message || 'Payment execution error',
          },
        });

        items.push({
          id: item.id,
          batchId: batch.id,
          employeeId: emp.id,
          employeeName: emp.name,
          employeeCode: emp.employeeId,
          department: emp.department,
          amount: item.amount,
          currency: item.currency,
          status: 'FAILED',
          failureReason: err.message,
          createdAt: item.createdAt,
        });
      }
    }

    const finalStatus =
      failedCount === 0 ? 'COMPLETED' : successCount > 0 ? 'PARTIAL' : 'FAILED';

    const updatedBatch = await prisma.payrollBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        successCount,
        failedCount,
        processedAt: new Date(),
      },
    });

    logger.info('Payroll batch execution finished', {
      requestId,
      batchNumber,
      finalStatus,
      successCount,
      failedCount,
    });

    return {
      id: updatedBatch.id,
      batchNumber: updatedBatch.batchNumber,
      title: updatedBatch.title,
      month: updatedBatch.month,
      totalEmployees: updatedBatch.totalEmployees,
      totalAmount: Number(updatedBatch.totalAmount),
      currency: updatedBatch.currency,
      status: updatedBatch.status,
      successCount: updatedBatch.successCount,
      failedCount: updatedBatch.failedCount,
      processedAt: updatedBatch.processedAt,
      createdAt: updatedBatch.createdAt,
      updatedAt: updatedBatch.updatedAt,
      items,
    };
  }

  async listPayrollBatches(
    limit = 50,
    offset = 0,
  ): Promise<{ batches: PayrollBatchResponse[]; total: number }> {
    const [batches, total] = await prisma.$transaction([
      prisma.payrollBatch.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: {
              employee: true,
            },
          },
        },
        take: limit,
        skip: offset,
      }),
      prisma.payrollBatch.count(),
    ]);

    const formatted: PayrollBatchResponse[] = batches.map((b) => ({
      id: b.id,
      batchNumber: b.batchNumber,
      title: b.title,
      month: b.month,
      totalEmployees: b.totalEmployees,
      totalAmount: Number(b.totalAmount),
      currency: b.currency,
      status: b.status,
      successCount: b.successCount,
      failedCount: b.failedCount,
      processedAt: b.processedAt,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      items: b.items.map((i) => ({
        id: i.id,
        batchId: i.batchId,
        employeeId: i.employeeId,
        employeeName: i.employee?.name,
        employeeCode: i.employee?.employeeId,
        department: i.employee?.department,
        amount: i.amount,
        currency: i.currency,
        status: i.status,
        paymentId: i.paymentId,
        idempotencyKey: i.idempotencyKey,
        failureReason: i.failureReason,
        createdAt: i.createdAt,
      })),
    }));

    return { batches: formatted, total };
  }

  async getPayrollBatchById(id: string): Promise<PayrollBatchResponse> {
    const batch = await prisma.payrollBatch.findFirst({
      where: {
        OR: [{ id }, { batchNumber: id }],
      },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!batch) {
      throw new NotFoundError('PayrollBatch', id);
    }

    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      title: batch.title,
      month: batch.month,
      totalEmployees: batch.totalEmployees,
      totalAmount: Number(batch.totalAmount),
      currency: batch.currency,
      status: batch.status,
      successCount: batch.successCount,
      failedCount: batch.failedCount,
      processedAt: batch.processedAt,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
      items: batch.items.map((i) => ({
        id: i.id,
        batchId: i.batchId,
        employeeId: i.employeeId,
        employeeName: i.employee?.name,
        employeeCode: i.employee?.employeeId,
        department: i.employee?.department,
        amount: i.amount,
        currency: i.currency,
        status: i.status,
        paymentId: i.paymentId,
        idempotencyKey: i.idempotencyKey,
        failureReason: i.failureReason,
        createdAt: i.createdAt,
      })),
    };
  }
}

export const payrollService = new PayrollService();
