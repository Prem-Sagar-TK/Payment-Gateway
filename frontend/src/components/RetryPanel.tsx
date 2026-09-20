import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Payment } from '../types';

interface Props {
  lastPayment: Payment | null;
  lastKey: string | null;
  onRetry: (p: Payment) => void;
}

interface RetryEntry {
  attempt: number;
  status: number;
  payment?: Payment;
  error?: string;
  idempotent: boolean;
  latencyMs: number;
}

export default function RetryPanel({ lastPayment, lastKey, onRetry }: Props) {
  const [entries, setEntries] = useState<RetryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const retry = async () => {
    if (!lastPayment || !lastKey) {
      toast.error('Create a payment first!');
      return;
    }
    setLoading(true);
    const attempt = entries.length + 1;
    const start = Date.now();

    try {
      const res = await api.createCharge(
        {
          amount: lastPayment.amount,
          currency: lastPayment.currency,
          customerId: lastPayment.customerId,
          description: lastPayment.description ?? undefined,
        },
        lastKey,
      );

      const latencyMs = Date.now() - start;

      if (res.success && res.data) {
        const entry: RetryEntry = {
          attempt,
          status: 200,
          payment: res.data,
          idempotent: res.data.idempotent,
          latencyMs,
        };
        setEntries((e) => [...e, entry]);
        onRetry(res.data);
        if (res.data.idempotent) {
          toast.success(`Attempt #${attempt}: ↩ Idempotent replay — same payment ID`, { icon: '🔁' });
        }
      } else {
        setEntries((e) => [
          ...e,
          { attempt, status: 409, error: res.error?.message, idempotent: false, latencyMs },
        ]);
        toast.error(res.error?.message ?? 'Error');
      }
    } catch (err) {
      setEntries((e) => [
        ...e,
        { attempt, status: 0, error: String(err), idempotent: false, latencyMs: Date.now() - start },
      ]);
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
          <div className="card-title">Retry Same Request</div>
          <div className="card-subtitle">Send the same payment repeatedly to observe idempotent replays</div>
        </div>
      </div>

      {lastPayment ? (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          Retrying payment <span className="mono">{lastPayment.id.slice(0, 16)}…</span>{' '}
          with key <span className="mono">{lastKey}</span>
        </div>
      ) : (
        <div className="alert alert-warn" style={{ marginBottom: 16 }}>
          Create a payment first using the form above.
        </div>
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={retry}
        disabled={loading || !lastPayment}
      >
        {loading ? <><span className="spinner" /> Retrying...</> : <><RefreshCw size={14} /> Retry Same Request</>}
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
              <div className="stat-label">Unique Payments</div>
              <div className="stat-value">{uniqueIds.size}</div>
              <div className="stat-sub">Should always be 1</div>
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
                      <span className={`badge ${e.status === 200 ? 'badge-green' : e.status === 409 ? 'badge-blue' : 'badge-red'}`}>
                        {e.status || 'ERR'}
                      </span>
                    </td>
                    <td className="mono truncate">{e.payment?.id ?? e.error ?? '—'}</td>
                    <td>
                      {e.idempotent
                        ? <span className="badge badge-green">↩ YES</span>
                        : <span className="badge badge-muted">NEW</span>}
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
