import { useState } from 'react';
import { Zap, RefreshCw, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Payment } from '../types';

function randomKey() {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface Props {
  onPaymentCreated: (p: Payment, idempotencyKey: string) => void;
}

export default function PaymentForm({ onPaymentCreated }: Props) {
  const [form, setForm] = useState({
    customerId: 'cus_123',
    amount: '4999',
    currency: 'INR',
    description: 'Premium subscription',
    idempotencyKey: randomKey(),
  });
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Payment | null>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.idempotencyKey.trim()) {
      toast.error('Idempotency key is required');
      return;
    }
    setLoading(true);
    try {
      const res = await api.createCharge(
        {
          amount: parseInt(form.amount, 10),
          currency: form.currency,
          customerId: form.customerId,
          description: form.description,
        },
        form.idempotencyKey,
      );

      if (res.success && res.data) {
        setLastResult(res.data);
        onPaymentCreated(res.data, form.idempotencyKey);
        if (res.data.idempotent) {
          toast.success('↩ Idempotent replay — same payment returned', { icon: '🔁' });
        } else {
          toast.success('✅ Payment created successfully!');
        }
      } else {
        toast.error(res.error?.message ?? 'Payment failed');
      }
    } catch (e) {
      toast.error('Network error — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-icon blue"><Zap size={16} /></div>
        <div>
          <div className="card-title">Create Payment</div>
          <div className="card-subtitle">POST /api/v1/charges with Idempotency-Key header</div>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Customer ID</label>
          <input value={form.customerId} onChange={(e) => set('customerId', e.target.value)} placeholder="cus_123" />
        </div>

        <div className="field">
          <label>Amount (smallest unit)</label>
          <input type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="4999" />
        </div>

        <div className="field">
          <label>Currency</label>
          <select value={form.currency} onChange={(e) => set('currency', e.target.value)}>
            {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Description (optional)</label>
          <input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Premium subscription" />
        </div>

        <div className="field full field-mono">
          <label>Idempotency Key</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={form.idempotencyKey}
              onChange={(e) => set('idempotencyKey', e.target.value)}
              placeholder="order_123_payment"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
            />
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => set('idempotencyKey', randomKey())}
              title="Generate new key"
              style={{ flexShrink: 0 }}
            >
              <RefreshCw size={13} />
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { navigator.clipboard.writeText(form.idempotencyKey); toast.success('Copied!'); }}
              title="Copy key"
              style={{ flexShrink: 0 }}
            >
              <Copy size={13} />
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <button className="btn btn-primary btn-lg btn-full" onClick={handleSubmit} disabled={loading}>
          {loading ? <><span className="spinner" /> Processing...</> : <><Zap size={15} /> Create Payment</>}
        </button>
      </div>

      {lastResult && (
        <div style={{ marginTop: 16 }}>
          <div className="alert alert-success">
            <span>
              {lastResult.idempotent ? '↩ Idempotent replay' : '✅ New payment'}
              {' — '}
              <span className="mono">{lastResult.id}</span>
              {' — '}
              {lastResult.currency} {(lastResult.amount / 100).toFixed(2)}
            </span>
          </div>
          <pre className="code-block" style={{ fontSize: '0.72rem' }}>
            {JSON.stringify(lastResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
