import React, { useState, useEffect } from 'react';
import {
  RotateCcw, CheckCircle2, AlertCircle, ShieldCheck,
  User, DollarSign, Globe, KeyRound, ArrowUpRight, Inbox, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Payment } from '../types';

interface RetryEntry {
  attempt: number;
  status: number;
  payment?: Payment;
  error?: string;
  idempotent: boolean;
  latencyMs: number;
}

interface Props {
  onPaymentCreated?: () => void;
  selectedPaymentToRetry?: Payment | null;
}

export default function RetryPage({ onPaymentCreated, selectedPaymentToRetry }: Props) {
  const [key, setKey] = useState('retry_demo_key_001');
  const [customerId, setCustomerId] = useState('cus_123');
  const [amount, setAmount] = useState('4999');
  const [currency, setCurrency] = useState('INR');
  const [entries, setEntries] = useState<RetryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentFailedPayments, setRecentFailedPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (selectedPaymentToRetry) {
      setKey(selectedPaymentToRetry.idempotencyKey || `retry_${selectedPaymentToRetry.id.slice(0, 8)}`);
      setCustomerId(selectedPaymentToRetry.customerId || 'cus_123');
      setAmount(String(selectedPaymentToRetry.amount));
      setCurrency(selectedPaymentToRetry.currency || 'INR');
    }
  }, [selectedPaymentToRetry]);

  useEffect(() => {
    // Fetch recent payments to give quick-pick options for retries
    api.listPayments(20).then((res) => {
      if (res.success && res.data?.data) {
        setRecentFailedPayments(res.data.data as Payment[]);
      }
    });
  }, []);

  const sendRequest = async () => {
    if (!key.trim()) {
      toast.error('Enter a Safety Key first');
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
          description: `Retry attempt #${attempt}`,
        },
        key,
      );
      const latencyMs = Date.now() - start;
      const paymentData = res.data?.data;

      if (res.success && paymentData) {
        const idempotent = Boolean(paymentData.idempotent || res.isReplay);
        setEntries((e) => [
          ...e,
          { attempt, status: res.status, payment: paymentData, idempotent, latencyMs },
        ]);
        if (onPaymentCreated) onPaymentCreated();
        if (idempotent) {
          toast('Same payment ID returned — duplicate safely intercepted', {
            icon: <RotateCcw size={16} color="#16a34a" />,
          });
        } else {
          toast.success(`Attempt #${attempt}: payment created`);
        }
      } else {
        setEntries((e) => [
          ...e,
          {
            attempt,
            status: res.status,
            error: res.error?.message,
            idempotent: false,
            latencyMs,
          },
        ]);
        toast.error(res.error?.message ?? `Error ${res.status}`);
      }
    } catch (err: any) {
      setEntries((e) => [
        ...e,
        {
          attempt,
          status: 0,
          error: err?.message || 'Network error',
          idempotent: false,
          latencyMs: Date.now() - start,
        },
      ]);
      toast.error('Cannot reach server');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExisting = (p: Payment) => {
    setKey(p.idempotencyKey || `key_${p.id.slice(0, 10)}`);
    setCustomerId(p.customerId || 'cus_123');
    setAmount(String(p.amount));
    setCurrency(p.currency);
    toast.success(`Loaded payment details: ${p.id.slice(0, 12)}…`);
  };

  const uniquePayments = new Set(entries.map((e) => e.payment?.id).filter(Boolean));
  const replayCount = entries.filter((e) => e.idempotent).length;
  const isGuaranteeMet = entries.length > 0 && uniquePayments.size === 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">
          <RotateCcw size={14} />
          Try Again
        </div>
        <h1 className="page-title">Retry Simulator &amp; Payment Recovery</h1>
        <p className="page-desc">
          When transactions fail, time out, or need retrying, the <strong>Safety Key</strong> acts as an immutable fingerprint.
          No matter how many times you retry with the same key, only <strong>one</strong> transaction is ever charged.
        </p>
      </div>

      <div className="g-card" style={{ background: 'var(--green-bg)', borderColor: 'var(--green-border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div className="g-card-icon green" style={{ width: 36, height: 36 }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--green-dark)', marginBottom: 4 }}>
              How Idempotent Retry Protection Works
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Whether a network connection drops or a client triggers rapid repeat requests, the <strong>Safety Key</strong> ensures safe idempotent execution. Subsequent attempts return the exact original payment without duplicate deductions.
            </div>
          </div>
        </div>
      </div>

      {/* Select from recent payments */}
      {recentFailedPayments.length > 0 && (
        <div className="g-card" style={{ marginBottom: 24 }}>
          <div className="g-card-title" style={{ fontSize: '0.95rem', marginBottom: 12 }}>
            Pick from Recent Transactions to Retry
          </div>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {recentFailedPayments.slice(0, 5).map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleSelectExisting(p)}
                style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 12px' }}
              >
                <div style={{ fontWeight: 700 }}>{p.currency} {(p.amount / 100).toFixed(2)}</div>
                <div className="td-mono text-xs text-muted">{p.customerId} • {p.status}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="g-card">
        <div className="g-card-header">
          <div className="g-card-icon green"><RefreshCw size={20} /></div>
          <div>
            <div className="g-card-title">Configure Retry Parameters</div>
            <div className="g-card-subtitle">Set payment details and retain the same Safety Key</div>
          </div>
        </div>

        <div className="form-grid" style={{ gap: '16px', marginBottom: '20px' }}>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><User size={14} /></span>
              Customer ID
            </label>
            <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="cus_123" />
          </div>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><DollarSign size={14} /></span>
              Amount (paise / cents)
            </label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><Globe size={14} /></span>
              Currency
            </label>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {['INR', 'USD', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><KeyRound size={14} /></span>
              Safety Key (Idempotency Key)
            </label>
            <input
              className="mono-input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="keep-this-same-to-test-retry"
            />
            <div className="field-hint">Keep the same key to verify zero-duplicate retry protection</div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={sendRequest}
          disabled={loading}
        >
          {loading ? (
            <><span className="spinner" /> Sending...</>
          ) : (
            <><RotateCcw size={18} /> Send Same Request {entries.length > 0 ? `(Attempt #${entries.length + 1})` : ''}</>
          )}
        </button>
      </div>

      {entries.length > 0 && (
        <>
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
            <div className="stat-tile">
              <div className="stat-tile-icon"><ArrowUpRight size={18} /></div>
              <div className="stat-tile-value">{entries.length}</div>
              <div className="stat-tile-label">Requests Sent</div>
            </div>
            <div className="stat-tile green">
              <div className="stat-tile-icon"><RotateCcw size={18} /></div>
              <div className="stat-tile-value green">{replayCount}</div>
              <div className="stat-tile-label">Safe Replays</div>
              <div className="stat-tile-hint">No duplicate charge</div>
            </div>
            <div className={`stat-tile ${isGuaranteeMet ? 'green' : 'amber'}`}>
              <div className="stat-tile-icon">
                {isGuaranteeMet ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              </div>
              <div className={`stat-tile-value ${isGuaranteeMet ? 'green' : 'amber'}`}>{uniquePayments.size}</div>
              <div className="stat-tile-label">Unique Payments in DB</div>
              <div className="stat-tile-hint">Target: exactly 1</div>
            </div>
          </div>

          {isGuaranteeMet && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <span className="alert-icon"><ShieldCheck size={18} /></span>
              <div>
                <strong>Zero Duplicate Guarantee Confirmed</strong><br />
                <span className="text-sm">
                  {entries.length} requests sent with the identical key. Only <strong>1 payment record</strong> was
                  created in the database. The other {replayCount} request{replayCount !== 1 ? 's' : ''} received a safe cached replay.
                </span>
              </div>
            </div>
          )}

          <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="g-card-title">Attempt Log</div>
            </div>
            <div className="table-shell" style={{ borderRadius: 0, border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Result</th>
                    <th>Payment ID</th>
                    <th>Duplicate Status</th>
                    <th>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.attempt}>
                      <td className="td-mono">{e.attempt}</td>
                      <td>
                        <span className={`badge ${e.status === 200 || e.status === 201 ? 'badge-success' : e.status === 409 ? 'badge-warning' : 'badge-danger'}`}>
                          {e.status === 200 || e.status === 201 ? 'Success' : e.status === 409 ? 'In-flight' : `Error ${e.status}`}
                        </span>
                      </td>
                      <td className="td-mono td-truncate" title={e.payment?.id}>
                        {e.payment?.id ? e.payment.id.slice(0, 24) + '…' : e.error ?? '—'}
                      </td>
                      <td>
                        {e.idempotent ? (
                          <span className="badge badge-indigo">Replay (Safe)</span>
                        ) : (
                          <span className="badge badge-success">New Payment</span>
                        )}
                      </td>
                      <td className="td-mono">{e.latencyMs}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
