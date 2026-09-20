export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export type IdempotencyStatus = 'PROCESSING' | 'SUCCEEDED' | 'FAILED';
export type ProviderMode = 'success' | 'failure' | 'timeout' | 'random';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  customerId: string;
  description?: string | null;
  status: PaymentStatus;
  providerReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  idempotent: boolean;
}

export interface IdempotencyRecord {
  id: string;
  customerId: string;
  key: string;
  requestHash: string;
  status: IdempotencyStatus;
  responseStatus?: number | null;
  paymentId?: string | null;
  replayCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  meta?: { requestId?: string; timestamp: string };
}

export interface CreateChargePayload {
  amount: number;
  currency: string;
  customerId: string;
  description?: string;
}

export interface ConcurrentTestResult {
  total: number;
  responses: Array<{ status: number; payment?: Payment; error?: string; latencyMs: number }>;
  uniquePayments: number;
  successCount: number;
  conflictCount: number;
  errorCount: number;
  totalDurationMs: number;
  avgLatencyMs: number;
}
