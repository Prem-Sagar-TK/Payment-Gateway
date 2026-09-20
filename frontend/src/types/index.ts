export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'SUCCESS' | 'FAILED' | 'FAILURE' | 'REFUNDED' | 'PROCESSING';

export type IdempotencyStatus = 'PROCESSING' | 'SUCCEEDED' | 'RESOLVED' | 'FAILED';
export type ProviderMode = 'success' | 'failure' | 'timeout' | 'random';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  customerId: string;
  customer_id?: string;
  description?: string | null;
  status: PaymentStatus;
  providerReference?: string | null;
  failureReason?: string | null;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  idempotent: boolean;
}

export interface IdempotencyRecord {
  id: string;
  customerId: string;
  customer_id?: string;
  key: string;
  idempotencyKey?: string;        // alias for 'key'
  requestHash: string;
  status: string;
  responseStatus?: number | null;
  responseCode?: number | null;
  paymentId?: string | null;
  payment_id?: string | null;     // backend alias
  replayCount: number;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  expiresAt?: string;
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
  customerId?: string;
  customer_id?: string;
  description?: string;
}

export interface ConcurrencyResult {
  requestId: number;
  status: number;
  isReplay: boolean;
  paymentId?: string;
  error?: string;
  latencyMs: number;
  timestamp: number;
}

export interface ConcurrencyStats {
  total: number;
  created: number;
  replayed: number;
  conflict: number;
  failed: number;
  uniquePaymentIds: number;
  totalDurationMs: number;
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
