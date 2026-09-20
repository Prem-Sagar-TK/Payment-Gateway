import type {
  ApiResponse,
  Payment,
  IdempotencyRecord,
  CreateChargePayload,
  ProviderMode,
} from '../types';

const BASE = '/api/v1';

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  return res.json() as Promise<ApiResponse<T>>;
}

export const api = {
  createCharge: (
    payload: CreateChargePayload,
    idempotencyKey: string,
  ): Promise<ApiResponse<Payment>> =>
    apiFetch<Payment>('/charges', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload),
    }),

  getCharge: (id: string): Promise<ApiResponse<Payment>> =>
    apiFetch<Payment>(`/charges/${id}`),

  getCustomerCharges: (
    customerId: string,
    limit = 50,
  ): Promise<ApiResponse<{ payments: Payment[]; total: number }>> =>
    apiFetch(`/customers/${encodeURIComponent(customerId)}/charges?limit=${limit}`),

  getIdempotencyRecord: (
    key: string,
    customerId: string,
  ): Promise<ApiResponse<IdempotencyRecord>> =>
    apiFetch(
      `/idempotency/${encodeURIComponent(key)}?customerId=${encodeURIComponent(customerId)}`,
    ),

  setProviderMode: (mode: ProviderMode): Promise<ApiResponse<{ mode: string }>> =>
    apiFetch('/demo/provider-mode', {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),

  getProviderMode: (): Promise<ApiResponse<{ mode: ProviderMode }>> =>
    apiFetch('/demo/provider-mode'),

  reset: (): Promise<ApiResponse<{ deletedRecords: number; deletedPayments: number }>> =>
    apiFetch('/demo/reset', { method: 'POST' }),

  health: (): Promise<{ status: string }> =>
    fetch(`${BASE}/health`).then((r) => r.json() as Promise<{ status: string }>),
};
