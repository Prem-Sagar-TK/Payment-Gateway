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
  /** true when this response was replayed from a previous idempotent request */
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

// ─── Express Request augmentation ─────────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
