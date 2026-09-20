import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Payment } from '../types';

interface Props {
  lastPayment?: Payment | null;
  lastKey?: string | null;
  onRetry?: (p: Payment) => void;
  onChargeCreated?: (res: any) => void;
}

interface RetryEntry {
  attempt: number;
  status: number;
  payment?: Payment;
  error?: string;
  idempotent: boolean;
  latencyMs: number;
}

export function RetryPanel({ lastPayment, lastKey, onRetry, onChargeCreated }: Props) {
  const [key, setKey] = useState<string>(lastKey || 'order_retry_sample_01');
  const [customerId, setCustomerId] = useState<string>(lastPayment?.customerId || 'cus_123');
  const [amount, setAmount] = useState<string>(String(lastPayment?.amount || 4999));
  const [currency, setCurrency] = useState<string>(lastPayment?.currency || 'INR');
  const [entries, setEntries] = useState<RetryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const retry = async () => {
    if (!key.trim()) {
      toast.error('Enter an Idempotency Key first');
      return;
    }
    setLoading(true);
    const attempt = entries.length + 1;
    const start = Date.now();

    try {
      const res = await api.createCharge(
        {
          amount: parseInt(amount, 10),
          currency,
          customerId,
          description: `Interactive retry attempt #${attempt}`,
        },
        key,
      );

      const latencyMs = Date.now() - start;
      const paymentData = res.data?.data;

      if (res.success && paymentData) {
        const entry: RetryEntry = {
          attempt,
          status: res.status,
          payment: paymentData,
          idempotent: paymentData.idempotent,
          latencyMs,
        };
        setEntries((e) => [...e, entry]);
        if (onRetry) onRetry(paymentData);
        if (onChargeCreated) onChargeCreated(res.data);
        if (paymentData.idempotent) {
          toast.success(`Attempt #${attempt}: Idempotent replay — same payment ID`);
        } else {
          toast.success(`Attempt #${attempt}: New payment created`);
        }
      } else {
        setEntries((e) => [
          ...e,
          { attempt, status: res.status || 409, error: res.error?.message, idempotent: false, latencyMs },
        ]);
        toast.error(res.error?.message ?? `Error (${res.status})`);
      }
    } catch (err: any) {
      setEntries((e) => [
        ...e,
        { attempt, status: 0, error: String(err?.message || err), idempotent: false, latencyMs: Date.now() - start },
      ]);
      toast.error('Network request failed');
    } finally {
      setLoading(false);
    }
  };

  const idempotentCount = entries.filter((e) => e.idempotent).length;
  const uniqueIds = new Set(entries.map((e) => e.payment?.id).filter(Boolean));

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon purple"><RefreshCw size={16} /></div>
        <div>
          <div className="card-title">Interactive Retry Simulator</div>
          <div className="card-subtitle">Dispatch repetitive POST /charges with identical keys to verify caching &amp; replay mechanics</div>
        </div>
      </div>

      <div className="form-grid" style={{ marginBottom: 16 }}>
        <div className="field">
          <label>Customer ID</label>
          <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="cus_123" />
        </div>

        <div className="field">
          <label>Amount (in smallest unit)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="4999" />
        </div>

        <div className="field">
          <label>Currency</label>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['INR', 'USD', 'EUR', 'GBP'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Fixed Idempotency-Key</label>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="order_key_to_retry"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </div>
      </div>

      <button
        className="btn btn-primary btn-full"
        onClick={retry}
        disabled={loading}
      >
        {loading ? <><span className="spinner" /> Retrying...</> : <><RefreshCw size={14} /> Send Idempotent Request (#{entries.length + 1})</>}
      </button>

      {entries.length > 0 && (
        <>
          <div className="divider" />

          <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 16 }}>
            <div className="stat-card">
              <div className="stat-label">Retries Sent</div>
              <div className="stat-value accent">{entries.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Replays (idempotent)</div>
              <div className="stat-value green">{idempotentCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unique DB Payments</div>
              <div className="stat-value">{uniqueIds.size}</div>
              <div className="stat-sub">Expected: 1</div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Status</th>
                  <th>Payment ID</th>
                  <th>Idempotent?</th>
                  <th>Latency</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.attempt}>
                    <td className="mono">{e.attempt}</td>
                    <td>
                      <span className={`badge ${e.status === 200 || e.status === 201 ? 'badge-green' : e.status === 409 ? 'badge-blue' : 'badge-red'}`}>
                        {e.status || 'ERR'}
                      </span>
                    </td>
                    <td className="mono truncate">{e.payment?.id ?? e.error ?? '—'}</td>
                    <td>
                      {e.idempotent
                        ? <span className="badge badge-green">Replay</span>
                        : <span className="badge badge-muted">New (1st)</span>}
                    </td>
                    <td className="mono">{e.latencyMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default RetryPanel;
