import React, { useState } from 'react';
import {
  Play, RotateCcw, ShieldCheck, AlertTriangle, CheckCircle2,
  Zap, Lock, Unlock, User, DollarSign, Globe, KeyRound, Layers, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { ConcurrencyResult, ConcurrencyStats } from '../types';

const genId = () => Math.random().toString(36).substring(2, 10);

interface Props {
  onTestComplete?: () => void;
}

export default function StressTestPage({ onTestComplete }: Props) {
  const [count, setCount] = useState(10);
  const [sameKey, setSameKey] = useState(true);
  const [key, setKey] = useState(() => `batch_${genId()}`);
  const [amount, setAmount] = useState(4999);
  const [currency, setCurrency] = useState('INR');
  const [customerId, setCustomerId] = useState('cus_batch_test');
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ConcurrencyResult[]>([]);
  const [stats, setStats] = useState<ConcurrencyStats | null>(null);

  const runTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResults([]);
    setStats(null);

    const testStart = performance.now();
    const currentKey = key;
    const toastId = toast.loading(`Sending ${count} parallel requests...`);

    try {
      const requests = Array.from({ length: count }, (_, i) => {
        const idempKey = sameKey ? currentKey : `batch_${genId()}`;
        const reqStart = performance.now();

        return api.createCharge(
          { amount, currency, customer_id: customerId, description: `Batch #${i + 1}` },
          idempKey,
        ).then(res => {
          const latency = Math.round(performance.now() - reqStart);
          const item: ConcurrencyResult = {
            requestId: i + 1,
            status: res.status,
            isReplay: res.isReplay || Boolean(res.data?.data?.idempotent),
            paymentId: res.data?.data?.id,
            error: res.error?.message,
            latencyMs: latency,
            timestamp: Date.now(),
          };
          setResults(prev => [...prev, item]);
          return item;
        }).catch((err: any) => {
          const item: ConcurrencyResult = {
            requestId: i + 1,
            status: 0,
            isReplay: false,
            error: err?.message || 'Network error',
            latencyMs: Math.round(performance.now() - reqStart),
            timestamp: Date.now(),
          };
          setResults(prev => [...prev, item]);
          return item;
        });
      });

      const all = await Promise.all(requests);
      const totalMs = Math.round(performance.now() - testStart);

      let created = 0, replayed = 0, conflict = 0, failed = 0;
      const uniqueIds = new Set<string>();

      all.forEach(r => {
        if (r.status === 200 || r.status === 201) {
          if (r.isReplay) replayed++; else created++;
          if (r.paymentId) uniqueIds.add(r.paymentId);
        } else if (r.status === 409) {
          conflict++;
        } else {
          failed++;
        }
      });

      setStats({ total: count, created, replayed, conflict, failed, uniquePaymentIds: uniqueIds.size, totalDurationMs: totalMs });
      toast.success(`Completed in ${totalMs}ms`, { id: toastId });
      if (onTestComplete) onTestComplete();
    } catch (err: any) {
      toast.error(`Test failed: ${err?.message}`, { id: toastId });
    } finally {
      setIsRunning(false);
    }
  };

  const slots = Array.from({ length: count }, (_, i) => results[i] || null);

  const getSlotClass = (r: ConcurrencyResult | null) => {
    if (!r) return 'dot-idle';
    if (r.status === 200 || r.status === 201) return r.isReplay ? 'dot-replay' : 'dot-created';
    if (r.status === 409) return 'dot-conflict';
    return 'dot-error';
  };

  const getTooltip = (r: ConcurrencyResult | null, i: number) => {
    if (!r) return `Request #${i + 1}: Waiting…`;
    const status = r.isReplay ? 'Safe replay' : r.status === 200 || r.status === 201 ? 'New payment' : r.status === 409 ? 'In-flight (409)' : `Error ${r.status}`;
    return `#${r.requestId} → ${status} | ${r.latencyMs}ms`;
  };

  const guarantee = stats && sameKey && stats.uniquePaymentIds === 1;

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">
          <Zap size={14} />
          Batch Test
        </div>
        <h1 className="page-title">Stress &amp; Concurrency Test</h1>
        <p className="page-desc">
          Send many payments simultaneously. If all requests share the <strong>same Safety Key</strong>,
          only <strong>1 payment record</strong> will be created — all other concurrent requests are safely deduplicated.
        </p>
      </div>

      <div className="g-card">
        <div className="g-card-header">
          <div className="g-card-icon green"><Play size={20} /></div>
          <div>
            <div className="g-card-title">Test Configuration</div>
            <div className="g-card-subtitle">Choose how many requests to fire simultaneously</div>
          </div>
        </div>

        <div className="form-grid cols-3" style={{ gap: '16px', marginBottom: '20px' }}>
          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><Layers size={14} /></span>
              Request Count
            </label>
            <select value={count} onChange={e => setCount(Number(e.target.value))} disabled={isRunning}>
              <option value={5}>5 requests</option>
              <option value={10}>10 requests</option>
              <option value={25}>25 requests</option>
              <option value={50}>50 requests</option>
              <option value={100}>100 requests</option>
            </select>
          </div>

          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><KeyRound size={14} /></span>
              Key Mode
            </label>
            <div style={{ display: 'flex', gap: 8, height: 42 }}>
              <button
                type="button"
                onClick={() => setSameKey(true)}
                disabled={isRunning}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 'var(--radius-xs)',
                  border: `1px solid ${sameKey ? 'var(--green)' : 'var(--border)'}`,
                  background: sameKey ? 'var(--green-bg)' : '#ffffff',
                  color: sameKey ? 'var(--green-dark)' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                <Lock size={13} /> Same Key
              </button>
              <button
                type="button"
                onClick={() => setSameKey(false)}
                disabled={isRunning}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 'var(--radius-xs)',
                  border: `1px solid ${!sameKey ? 'var(--black)' : 'var(--border)'}`,
                  background: !sameKey ? 'var(--black)' : '#ffffff',
                  color: !sameKey ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                  cursor: 'pointer',
                }}
              >
                <Unlock size={13} /> Unique Keys
              </button>
            </div>
            <div className="field-hint">{sameKey ? 'Tests duplicate deduplication' : 'Tests high-throughput creation'}</div>
          </div>

          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><KeyRound size={14} /></span>
              Safety Key
            </label>
            <div className="input-group">
              <input
                className="mono-input"
                value={sameKey ? key : 'Auto-generated per request'}
                onChange={e => setKey(e.target.value)}
                disabled={isRunning || !sameKey}
              />
              {sameKey && (
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setKey(`batch_${genId()}`)}
                  disabled={isRunning}
                  title="New key"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><User size={14} /></span>
              Customer ID
            </label>
            <input value={customerId} onChange={e => setCustomerId(e.target.value)} disabled={isRunning} />
          </div>

          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><DollarSign size={14} /></span>
              Amount
            </label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} disabled={isRunning} />
          </div>

          <div className="field">
            <label className="field-label">
              <span className="field-label-icon"><Globe size={14} /></span>
              Currency
            </label>
            <select value={currency} onChange={e => setCurrency(e.target.value)} disabled={isRunning}>
              {['INR','USD','EUR','GBP'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={runTest}
          disabled={isRunning}
        >
          {isRunning
            ? <><span className="spinner" /> Sending {count} concurrent requests...</>
            : <><Play size={18} /> Fire {count} Requests Simultaneously</>
          }
        </button>
      </div>

      <div className="g-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <div className="g-card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Live Request Visualizer
              {isRunning && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--green-dark)' }}>Sending…</span>
                </span>
              )}
            </div>
            <div className="g-card-subtitle">Each block represents one request resolving in real time</div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.75rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="dot dot-created" style={{ width: 12, height: 12, display: 'inline-block', borderRadius: 3 }} /> New Payment
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="dot dot-replay" style={{ width: 12, height: 12, display: 'inline-block', borderRadius: 3 }} /> Replay
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="dot dot-conflict" style={{ width: 12, height: 12, display: 'inline-block', borderRadius: 3 }} /> In-Flight
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="dot dot-error" style={{ width: 12, height: 12, display: 'inline-block', borderRadius: 3 }} /> Error
            </span>
          </div>
        </div>

        <div className="dot-grid">
          {slots.map((r, i) => (
            <div
              key={i}
              className={`dot ${getSlotClass(r)}`}
              title={getTooltip(r, i)}
              style={{ width: 28, height: 28 }}
            />
          ))}
        </div>
      </div>

      {stats && (
        <>
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-tile green">
              <div className="stat-tile-icon"><CheckCircle2 size={18} /></div>
              <div className="stat-tile-value green">{stats.created}</div>
              <div className="stat-tile-label">New Payments Created</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile-icon"><RotateCcw size={18} /></div>
              <div className="stat-tile-value">{stats.replayed}</div>
              <div className="stat-tile-label">Safe Replays (Deduplicated)</div>
            </div>
            <div className={`stat-tile ${sameKey ? (stats.uniquePaymentIds === 1 ? 'green' : 'rose') : 'green'}`}>
              <div className="stat-tile-icon">
                {sameKey ? (stats.uniquePaymentIds === 1 ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />) : <Activity size={18} />}
              </div>
              <div className={`stat-tile-value ${sameKey ? (stats.uniquePaymentIds === 1 ? 'green' : 'rose') : 'green'}`}>
                {stats.uniquePaymentIds}
              </div>
              <div className="stat-tile-label">Unique DB Records</div>
              {sameKey && <div className="stat-tile-hint">Expected: 1</div>}
            </div>
          </div>

          <div className="alert" style={{
            background: guarantee ? 'var(--green-bg)' : sameKey ? 'var(--rose-bg)' : '#ffffff',
            borderColor: guarantee ? 'var(--green-border)' : sameKey ? 'var(--rose-border)' : 'var(--border)',
            marginBottom: 20,
          }}>
            <div className="alert-icon">
              {guarantee ? <ShieldCheck size={20} color="var(--green)" /> : sameKey ? <AlertTriangle size={20} color="var(--rose)" /> : <CheckCircle2 size={20} color="var(--green)" />}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4,
                color: guarantee ? 'var(--green-dark)' : sameKey ? 'var(--rose)' : 'var(--text-primary)' }}>
                {guarantee
                  ? 'Zero Duplicate Guarantee Verified'
                  : sameKey
                  ? `Notice: ${stats.uniquePaymentIds} records created (expected 1)`
                  : `${stats.uniquePaymentIds} unique payments processed in ${stats.totalDurationMs}ms`}
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {guarantee
                  ? `All ${stats.total} concurrent requests with the identical Safety Key yielded exactly 1 payment in the database. Every duplicate request was correctly intercepted.`
                  : sameKey
                  ? 'Ensure the Safety Key is identical across attempts and retry.'
                  : `High-throughput test: ${stats.total} independent payments created concurrently in ${stats.totalDurationMs}ms.`}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
