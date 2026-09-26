import React, { useState } from 'react';
import {
  Settings2, CheckCircle2, XCircle, Clock, Shuffle, Info, Zap, RotateCcw, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

type Mode = 'success' | 'failure' | 'timeout' | 'random';

interface Props {
  providerMode: Mode;
  providerLatency: number;
  onModeChange?: (mode: Mode, latency: number) => void;
}

const MODES: { id: Mode; icon: React.ReactNode; label: string; desc: string; color: string }[] = [
  { id: 'success', icon: <CheckCircle2 size={24} />, label: 'Always Succeed', desc: 'All payments complete successfully', color: 'var(--green)' },
  { id: 'failure', icon: <XCircle size={24} />, label: 'Always Fail', desc: 'Simulate provider rejection', color: 'var(--rose)' },
  { id: 'timeout', icon: <Clock size={24} />, label: 'Simulate Timeout', desc: 'High latency connection timeout', color: 'var(--amber)' },
  { id: 'random',  icon: <Shuffle size={24} />, label: 'Random Flakiness', desc: 'Intermittent successes and failures', color: 'var(--black)' },
];

export default function SettingsPage({ providerMode, providerLatency, onModeChange }: Props) {
  const [mode, setMode] = useState<Mode>(providerMode);
  const [latency, setLatency] = useState(providerLatency);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.setProviderMode({ mode, latencyMs: latency });
      setSaved(true);
      toast.success('Settings saved successfully');
      if (onModeChange) onModeChange(mode, latency);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      toast.error(`Could not save settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const selectedMode = MODES.find(m => m.id === mode)!;

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">
          <Settings2 size={14} />
          Settings
        </div>
        <h1 className="page-title">Provider &amp; Gateway Settings</h1>
        <p className="page-desc">
          Configure simulated downstream behavior to test how the idempotency layer handles
          network delays, transient failures, and timeouts.
        </p>
      </div>

      <div className="g-card">
        <div className="g-card-header">
          <div className="g-card-icon green"><Settings2 size={20} /></div>
          <div>
            <div className="g-card-title">Provider Simulation Mode</div>
            <div className="g-card-subtitle">Select simulated payment provider response behavior</div>
          </div>
        </div>

        <div className="mode-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                padding: '20px 16px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${mode === m.id ? (m.id === 'success' ? 'var(--green)' : m.id === 'failure' ? 'var(--rose)' : m.id === 'timeout' ? 'var(--amber)' : 'var(--black)') : 'var(--border)'}`,
                background: mode === m.id ? (m.id === 'success' ? 'var(--green-bg)' : m.id === 'failure' ? 'var(--rose-bg)' : m.id === 'timeout' ? 'var(--amber-bg)' : '#f4f4f5') : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font-sans)',
                boxShadow: mode === m.id ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <div style={{ color: m.id === 'success' ? 'var(--green-dark)' : m.id === 'failure' ? 'var(--rose)' : m.id === 'timeout' ? 'var(--amber)' : 'var(--black)' }}>
                {m.icon}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {m.desc}
                </div>
              </div>
              {mode === m.id && (
                <span className="badge" style={{
                  background: m.id === 'success' ? 'var(--green-bg)' : m.id === 'failure' ? 'var(--rose-bg)' : m.id === 'timeout' ? 'var(--amber-bg)' : '#e4e4e7',
                  color: m.id === 'success' ? 'var(--green-dark)' : m.id === 'failure' ? 'var(--rose)' : m.id === 'timeout' ? 'var(--amber)' : 'var(--black)',
                  border: '1px solid currentColor',
                }}>
                  <Check size={11} /> Selected
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          <span className="alert-icon"><Info size={16} /></span>
          <span>
            <strong>Active Mode:</strong> {selectedMode.label} — {selectedMode.desc}
          </span>
        </div>

        <div className="field" style={{ marginBottom: 24 }}>
          <label className="field-label">
            <span className="field-label-icon"><Zap size={14} /></span>
            Simulated Downstream Latency: <strong style={{ color: latency < 200 ? 'var(--green-dark)' : latency < 800 ? 'var(--amber)' : 'var(--rose)' }}>{latency}ms</strong>
          </label>
          <input
            type="range"
            min={0}
            max={3000}
            step={50}
            value={latency}
            onChange={e => setLatency(Number(e.target.value))}
            style={{ cursor: 'pointer', padding: 0, height: 6, borderRadius: 3, accentColor: 'var(--green)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span className="text-xs text-muted">0ms (Instant)</span>
            <span className="text-xs" style={{ color: latency < 200 ? 'var(--green-dark)' : latency < 800 ? 'var(--amber)' : 'var(--rose)' }}>
              {latency < 200 ? 'Fast' : latency < 800 ? 'Moderate Delay' : 'High Latency'}
            </span>
            <span className="text-xs text-muted">3000ms (Timeout window)</span>
          </div>
        </div>

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <><span className="spinner" /> Saving changes...</>
          ) : saved ? (
            <><CheckCircle2 size={18} /> Settings Applied</>
          ) : (
            <><Settings2 size={18} /> Apply Settings</>
          )}
        </button>
      </div>

      <div className="g-card">
        <div className="g-card-title" style={{ marginBottom: 16 }}>Test Scenarios</div>
        <div style={{ display: 'grid', gap: 14 }}>
          {[
            { icon: <CheckCircle2 size={18} color="var(--green)" />, title: 'Standard Payments', desc: 'Use "Always Succeed" mode and navigate to Send Money to verify baseline processing.' },
            { icon: <RotateCcw size={18} color="var(--green-dark)" />, title: 'Idempotent Retries', desc: 'Use the "Try Again" simulator to confirm duplicate requests with the same key never double-charge.' },
            { icon: <Zap size={18} color="var(--black)" />, title: 'High Concurrency', desc: 'Use "Batch Test" to fire 10 to 100 simultaneous requests with the same safety key.' },
            { icon: <XCircle size={18} color="var(--rose)" />, title: 'Failure Recovery', desc: 'Switch to "Always Fail" mode to observe how declined payments and errors are recorded and safely retried.' },
            { icon: <Shuffle size={18} color="var(--amber)" />, title: 'Chaos & Flakiness', desc: 'Switch to "Random Flakiness" to simulate real-world unpredictable network conditions.' },
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                  {item.title}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
