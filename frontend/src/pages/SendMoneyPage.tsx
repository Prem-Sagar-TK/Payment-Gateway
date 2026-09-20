import React, { useState } from 'react';
import {
  CreditCard, Zap, RefreshCw, Copy, CheckCircle2, RotateCcw,
  User, DollarSign, Globe, FileText, KeyRound, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Payment } from '../types';

function randomKey() {
  return `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

interface Props {
  onPaymentCreated?: () => void;
}

export default function SendMoneyPage({ onPaymentCreated }: Props) {
  const [form, setForm] = useState({
    customerId: 'cus_123',
    amount: '4999',
    currency: 'INR',
    description: 'Premium subscription',
    idempotencyKey: randomKey(),
  });
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<Payment | null>(null);
  const [isReplay, setIsReplay] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.idempotencyKey.trim()) {
      toast.error('Safety key is required');
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

      const paymentData = res.data?.data;
      if (res.success && paymentData) {
        setLastResult(paymentData);
        const replay = Boolean(paymentData.idempotent || res.isReplay);
        setIsReplay(replay);
        if (onPaymentCreated) onPaymentCreated();
        if (replay) {
          toast('Duplicate detected: original payment returned safely', {
            icon: <RotateCcw size={16} color="#16a34a" />,
          });
        } else {
          toast.success('Payment processed successfully');
        }
      } else {
        toast.error(res.error?.message ?? 'Payment failed, please try again');
      }
    } catch {
      toast.error('Cannot reach server, please check backend connection');
    } finally {
      setLoading(false);
    }
  };

  const currencies = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD'];

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-eyebrow">
          <CreditCard size={14} />
          Send Money
        </div>
        <h1 className="page-title">Create a Payment</h1>
        <p className="page-desc">
          Fill in the details below. Each payment gets a unique <strong>Safety Key</strong> that prevents
          accidental duplicate charges even if submitted multiple times.
        </p>
      </div>

      {/* How it works */}
      <div className="how-steps">
        <div className="how-step">
          <div className="how-step-num">1</div>
          <span>Fill in amount &amp; details</span>
        </div>
        <div className="how-step">
          <div className="how-step-num">2</div>
          <span>Unique Safety Key assigned</span>
        </div>
        <div className="how-step">
          <div className="how-step-num">3</div>
          <span>Protected from duplicate charges</span>
        </div>
      </div>

      {/* Form Card */}
      <div className="g-card">
        <div className="g-card-header">
          <div className="g-card-icon green">
            <Zap size={20} />
          </div>
          <div>
            <div className="g-card-title">Payment Details</div>
            <div className="g-card-subtitle">All fields are required except description</div>
          </div>
        </div>

        <div className="form-grid" style={{ gap: '20px' }}>
          {/* Customer */}
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><User size={14} /></span>
              Customer ID
            </label>
            <input
              value={form.customerId}
              onChange={e => set('customerId', e.target.value)}
              placeholder="e.g. cus_123"
            />
            <div className="field-hint">Identifier for the payer</div>
          </div>

          {/* Amount */}
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><DollarSign size={14} /></span>
              Amount
            </label>
            <input
              type="number"
              value={form.amount}
              onChange={e => set('amount', e.target.value)}
              placeholder="4999"
            />
            <div className="field-hint">In smallest currency unit (paise / cents)</div>
          </div>

          {/* Currency */}
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><Globe size={14} /></span>
              Currency
            </label>
            <select value={form.currency} onChange={e => set('currency', e.target.value)}>
              {currencies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><FileText size={14} /></span>
              Description (optional)
            </label>
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What is this payment for?"
            />
          </div>

          {/* Safety Key */}
          <div className="field span-2">
            <label className="field-label">
              <span className="field-label-icon"><KeyRound size={14} /></span>
              Safety Key (Idempotency Key)
            </label>
            <div className="input-group">
              <input
                className="mono-input"
                value={form.idempotencyKey}
                onChange={e => set('idempotencyKey', e.target.value)}
                placeholder="auto-generated-key"
              />
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => set('idempotencyKey', randomKey())}
                title="Generate a new safety key"
                type="button"
              >
                <RefreshCw size={13} />
                New Key
              </button>
              <button
                className="btn-icon"
                onClick={() => {
                  navigator.clipboard.writeText(form.idempotencyKey);
                  toast.success('Key copied to clipboard');
                }}
                title="Copy key"
                type="button"
              >
                <Copy size={14} />
              </button>
            </div>
            <div className="field-hint">
              <ShieldCheck size={12} color="var(--green)" />
              Unique key prevents duplicate charges. Retrying with this same key returns the existing payment.
            </div>
          </div>
        </div>

        {/* Submit button */}
        <div style={{ marginTop: '28px' }}>
          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" /> Processing payment...</>
            ) : (
              <><Zap size={18} /> Send Payment</>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {lastResult && (
        <div className={`result-block ${isReplay ? 'replay' : ''}`}>
          <div className={`result-badge ${isReplay ? 'replay' : 'success'}`}>
            {isReplay ? (
              <><RotateCcw size={16} /> Duplicate detected — original payment returned safely</>
            ) : (
              <><CheckCircle2 size={16} /> Payment successful</>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Payment ID</div>
              <div className="mono text-sm" style={{ fontWeight: 600 }}>
                {lastResult.id.slice(0, 20)}…
              </div>
            </div>
            <div>
              <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Amount</div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                {lastResult.currency} {(lastResult.amount / 100).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Status</div>
              <span className={`badge ${lastResult.status === 'SUCCEEDED' || lastResult.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                {lastResult.status}
              </span>
            </div>
          </div>

          <details style={{ cursor: 'pointer' }}>
            <summary className="text-xs text-muted" style={{ userSelect: 'none', marginBottom: 8 }}>
              View raw response
            </summary>
            <pre className="code-block" style={{ marginTop: 8 }}>
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
