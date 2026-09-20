import React, { useState } from 'react';
import {
  RefreshCw, CheckCircle2, RotateCcw, AlertCircle, ShieldCheck,
  User, DollarSign, Globe, KeyRound, ArrowUpRight, Check, X, Zap
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
}

export default function RetryPage({ onPaymentCreated }: Props) {
  const [key, setKey] = useState('retry_demo_key_001');
  const [customerId, setCustomerId] = useState('cus_123');
  const [amount, setAmount] = useState('4999');
  const [currency, setCurrency] = useState('INR');
  const [entries, setEntries] = useState<RetryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    if (!key.trim()) { toast.error('Enter a Safety Key first'); return; }
    setLoading(true);
    const attempt = entries.length + 1;
    const start = Date.now();

    try {
      const res = await api.createCharge(
        { amount: parseInt(amount, 10), currency, customerId, description: `Retry attempt #${attempt}` },
        key,
      );
      const latencyMs = Date.now() - start;
      const paymentData = res.data?.data;

      if (res.success && paymentData) {
        const idempotent = Boolean(paymentData.idempotent || res.isReplay);
        setEntries(e => [...e, { attempt, status: res.status, payment: paymentData, idempotent, latencyMs }]);
        if (onPaymentCreated) onPaymentCreated();
        if (idempotent) {
          toast('Same payment ID returned — no duplicate charge', {
            icon: <RotateCcw size={16} color="#16a34a" />,
          });
        } else {
          toast.success(`Attempt #${attempt}: new payment created`);
        }
      } else {
        setEntries(e => [...e, { attempt, status: res.status, error: res.error?.message, idempotent: false, latencyMs }]);
        toast.error(res.error?.message ?? `Error ${res.status}`);
      }
    } catch (err: any) {
      setEntries(e => [...e, { attempt, status: 0, error: err?.message || 'Network error', idempotent: false, latencyMs: Date.now() - start }]);
      toast.error('Cannot reach server');
    } finally {
      setLoading(false);
    }
  };

  const uniquePayments = new Set(entries.map(e => e.payment?.id).filter(Boolean));
  const replayCount = entries.filter(e => e.idempotent).length;
  const isGuaranteeMet = entries.length > 0 && uniquePayments.size === 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">
          <RotateCcw size={14} />
          Try Again
        </div>
        <h1 className="page-title">Retry Simulator</h1>
        <p className="page-desc">
          Press "Send Same Request" multiple times. No matter how many times you press,
          only <strong>one</strong> payment will ever be created in the database. The rest are safe replays.
        </p>
      </div>

      {/* Visual explanation */}
      <div className="g-card" style={{ background: 'var(--green-bg)', borderColor: 'var(--green-border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div className="g-card-icon green" style={{ width: 36, height: 36 }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--green-dark)', marginBottom: 4 }}>
              How Retry Protection Works
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Network dropped or request timed out? Retry safely. The <strong>Safety Key</strong> below
              acts as a unique fingerprint: subsequent requests with the same key always return the original payment without charging again.
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="g-card">
        <div className="g-card-header">
          <div className="g-card-icon green"><RefreshCw size={20} /></div>
          <div>
            <div className="g-card-title">Configure Your Retry</div>
            <div className="g-card-subtitle">Set the payment details and keep the same Safety Key</div>
          </div>
        </div>

        <div className="form-grid" style={{ gap: '16px', marginBottom: '20px' }}>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><User size={14} /></span>
              Customer ID
            </label>
            <input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="cus_123" />
          </div>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><DollarSign size={14} /></span>
              Amount
            </label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><Globe size={14} /></span>
              Currency
            </label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              {['INR','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><KeyRound size={14} /></span>
              Safety Key
            </label>
            <input
              className="mono-input"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="keep-this-same-to-test-retry"
            />
            <div className="field-hint">Keep the same key to verify retry protection</div>
          </div>
        </div>

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={sendRequest}
          disabled={loading}
        >
          {loading
            ? <><span className="spinner" /> Sending...</>
            : <><RefreshCw size={18} /> Send Same Request {entries.length > 0 ? `(${entries.length + 1})` : ''}</>
          }
        </button>
      </div>

      {/* Results */}
      {entries.length > 0 && (
        <>
          {/* Stats row */}
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

          {/* Guarantee banner */}
          {isGuaranteeMet && (
            <div className="alert alert-success" style={{ marginBottom: 20 }}>
              <span className="alert-icon"><ShieldCheck size={18} /></span>
              <div>
                <strong>Zero Duplicate Guarantee Confirmed</strong><br />
                <span className="text-sm">
                  {entries.length} requests sent with the same key. Only <strong>1 payment record</strong> was
                  created in the database. The other {replayCount} request{replayCount !== 1 ? 's' : ''} received a safe cached reply.
                </span>
              </div>
            </div>
          )}

          {/* Results table */}
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
                    <th>Speed</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
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
                        {e.idempotent
                          ? <span className="badge badge-indigo">Replay (Safe)</span>
                          : <span className="badge badge-success">New Payment</span>}
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
