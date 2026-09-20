import type {
  ApiResponse,
  Payment,
  IdempotencyRecord,
  CreateChargePayload,
  ProviderMode,
} from '../types';

const BASE = '/api/v1';

export interface ApiResult<T> {
  status: number;
  isReplay: boolean;
  success: boolean;
  data?: ApiResponse<T>;
  error?: { code: string; message: string; details?: unknown };
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json', ...init?.headers },
      ...init,
    });
    
    let json: any = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    const isReplay =
      res.headers.get('x-idempotent-replay') === 'true' ||
      Boolean(json?.data?.idempotent);

    return {
      status: res.status,
      isReplay,
      success: res.ok && json?.success !== false,
      data: json,
      error: json?.error || (res.ok ? undefined : { code: 'HTTP_ERROR', message: `HTTP ${res.status}` }),
    };
  } catch (err: any) {
    return {
      status: 0,
      isReplay: false,
      success: false,
      error: { code: 'NETWORK_ERROR', message: err.message || 'Network error' },
    };
  }
}

export const api = {
  createCharge: (
    payload: CreateChargePayload,
    idempotencyKey: string,
  ): Promise<ApiResult<Payment>> => {
    const body = {
      amount: payload.amount,
      currency: payload.currency,
      customerId: payload.customerId || payload.customer_id || 'cus_123',
      description: payload.description,
    };
    return apiFetch<Payment>('/charges', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    });
  },

  listPayments: (limit = 50): Promise<ApiResult<Payment[]>> =>
    apiFetch<Payment[]>(`/payments?limit=${limit}`),

  getCharge: (id: string): Promise<ApiResult<Payment>> =>
    apiFetch<Payment>(`/charges/${id}`),

  refundPayment: (paymentId: string, payload?: { reason?: string }): Promise<ApiResult<any>> =>
    apiFetch(`/refunds/${encodeURIComponent(paymentId)}`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  listIdempotencyRecords: (limit = 50): Promise<ApiResult<IdempotencyRecord[]>> =>
    apiFetch<IdempotencyRecord[]>(`/idempotency/records?limit=${limit}`),

  getIdempotencyRecord: (
    key: string,
    customerId: string,
  ): Promise<ApiResult<IdempotencyRecord>> =>
    apiFetch(
      `/idempotency/${encodeURIComponent(key)}?customerId=${encodeURIComponent(customerId)}`,
    ),

  setProviderMode: (
    modeOrObj: ProviderMode | { mode: ProviderMode; latencyMs?: number },
  ): Promise<ApiResult<{ mode: string }>> => {
    const body =
      typeof modeOrObj === 'string'
        ? { mode: modeOrObj }
        : { mode: modeOrObj.mode, latencyMs: modeOrObj.latencyMs };
    return apiFetch('/demo/provider-mode', { method: 'POST', body: JSON.stringify(body) });
  },

  setProviderConfig: (mode: ProviderMode, latencyMs?: number): Promise<ApiResult<{ mode: string }>> =>
    apiFetch('/demo/provider-mode', {
      method: 'POST',
      body: JSON.stringify({ mode, latencyMs }),
    }),

  getProviderMode: (): Promise<ApiResult<{ mode: ProviderMode }>> =>
    apiFetch('/demo/provider-mode'),

  resetDemo: (): Promise<ApiResult<{ deletedRecords: number; deletedPayments: number }>> =>
    apiFetch('/demo/reset', { method: 'POST' }),

  reset: (): Promise<ApiResult<{ deletedRecords: number; deletedPayments: number }>> =>
    apiFetch('/demo/reset', { method: 'POST' }),

  health: (): Promise<{ status: string }> =>
    fetch(`${BASE}/health`).then((r) => r.json() as Promise<{ status: string }>),
};
