import { PaymentStatus, IdempotencyStatus } from '@prisma/client';

export interface CreateChargeInput {
  amount: number;
  currency: string;
  customerId: string;
  description?: string;
  idempotencyKey: string;
}

export interface PaymentResponse {
  id: string;
  amount: number;
  currency: string;
  customerId: string;
  description?: string | null;
  status: PaymentStatus;
  providerReference?: string | null;
  failureReason?: string | null;
  createdAt: Date;
  updatedAt: Date;

  idempotent: boolean;
}

export interface IdempotencyRecordResponse {
  id: string;
  customerId: string;
  key: string;
  requestHash: string;
  status: IdempotencyStatus;
  responseStatus?: number | null;
  paymentId?: string | null;
  replayCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RefundResponse {
  paymentId: string;
  refundReference: string;
  amount: number;
  currency: string;
  status: 'SUCCEEDED' | 'FAILED';
  createdAt: Date;
}

export type MockProviderMode = 'success' | 'failure' | 'timeout' | 'random';

export interface ProviderChargeResult {
  providerReference: string;
  status: 'succeeded' | 'failed';
  failureReason?: string;
}

export interface ProviderRefundResult {
  refundReference: string;
  status: 'succeeded' | 'failed';
}

export interface EmployeeInput {
  employeeId?: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  salary: number;
  currency?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  status?: string;
}

export interface ProcessPayrollInput {
  title?: string;
  employeeIds: string[];
}

export interface PayrollBatchResponse {
  id: string;
  batchNumber: string;
  title: string;
  month?: string | null;
  totalEmployees: number;
  totalAmount: number;
  currency: string;
  status: string;
  successCount: number;
  failedCount: number;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items?: PayrollItemResponse[];
}

export interface PayrollItemResponse {
  id: string;
  batchId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  department?: string;
  amount: number;
  currency: string;
  status: string;
  paymentId?: string | null;
  idempotencyKey?: string | null;
  failureReason?: string | null;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

