import React from 'react';
import {
  KeyRound, RefreshCw, ShieldCheck, CheckCircle2, XCircle, Clock, Inbox, Lock
} from 'lucide-react';
import type { IdempotencyRecord } from '../types';

interface Props {
  records: IdempotencyRecord[];
  loading: boolean;
  onRefresh: () => void;
}

function statusBadge(status: string) {
  if (status === 'COMPLETED' || status === 'SUCCESS') return 'badge-success';
  if (status === 'FAILED' || status === 'FAILURE') return 'badge-danger';
  if (status === 'PROCESSING') return 'badge-warning';
  return 'badge-muted';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'COMPLETED' || status === 'SUCCESS') return <CheckCircle2 size={12} />;
  if (status === 'FAILED' || status === 'FAILURE') return <XCircle size={12} />;
  if (status === 'PROCESSING') return <Clock size={12} />;
  return null;
}

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function KeysPage({ records, loading, onRefresh }: Props) {
  const activeKeys = records.filter(r => r.status === 'COMPLETED' || r.status === 'SUCCESS').length;
  const processingKeys = records.filter(r => r.status === 'PROCESSING').length;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-eyebrow">
              <KeyRound size={14} />
              Safety Keys
            </div>
            <h1 className="page-title">Duplicate Protection Keys</h1>
            <p className="page-desc">
              Every payment is stored alongside its unique Safety Key. The system checks this registry
              to intercept and deduplicate repeat requests.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? <span className="spinner" /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>
      </div>

      {/* How keys work */}
      <div className="g-card" style={{ background: 'var(--green-bg)', borderColor: 'var(--green-border)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div className="g-card-icon green" style={{ width: 36, height: 36 }}>
            <Lock size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--green-dark)', marginBottom: 6 }}>
              How Safety Keys Protect You
            </div>
            <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--green-dark)' }}>Step 1:</strong> Client submits payment with a unique key.<br />
              <strong style={{ color: 'var(--green-dark)' }}>Step 2:</strong> Key and result are indexed in the idempotency registry.<br />
              <strong style={{ color: 'var(--green-dark)' }}>Step 3:</strong> Any subsequent request with the same key returns the cached payment record.<br />
              <strong style={{ color: 'var(--green-dark)' }}>Result:</strong> Guaranteed single execution — no accidental duplicate charges.
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className="stat-tile">
          <div className="stat-tile-icon"><KeyRound size={18} /></div>
          <div className="stat-tile-value">{records.length}</div>
          <div className="stat-tile-label">Total Keys</div>
        </div>
        <div className="stat-tile green">
          <div className="stat-tile-icon"><CheckCircle2 size={18} /></div>
          <div className="stat-tile-value green">{activeKeys}</div>
          <div className="stat-tile-label">Completed</div>
          <div className="stat-tile-hint">Active protection</div>
        </div>
        <div className="stat-tile amber">
          <div className="stat-tile-icon"><Clock size={18} /></div>
          <div className="stat-tile-value amber">{processingKeys}</div>
          <div className="stat-tile-label">Processing</div>
          <div className="stat-tile-hint">In-flight transactions</div>
        </div>
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <div className="g-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Inbox size={36} /></div>
            <div className="empty-state-title">No safety keys found</div>
            <div className="empty-state-desc">
              Send your first payment and the Safety Key will appear here automatically.
            </div>
          </div>
        </div>
      ) : (
        <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-shell" style={{ borderRadius: 'var(--radius-lg)', border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Safety Key</th>
                  <th>Customer</th>
                  <th>Payment ID</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, idx) => (
                  <tr key={r.id ?? idx}>
                    <td>
                      <span className={`badge ${statusBadge(r.status)}`}>
                        <StatusIcon status={r.status} /> {r.status}
                      </span>
                    </td>
                    <td className="td-mono td-truncate" style={{ maxWidth: 220 }} title={r.idempotencyKey ?? r.key}>
                      {(r.idempotencyKey ?? r.key ?? '').slice(0, 30)}…
                    </td>
                    <td className="td-mono text-sm">{r.customerId ?? r.customer_id ?? '—'}</td>
                    <td className="td-mono td-truncate" title={r.paymentId ?? r.payment_id ?? ''}>
                      {r.paymentId ?? r.payment_id
                        ? ((r.paymentId ?? r.payment_id ?? '').slice(0, 18) + '…')
                        : '—'}
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(r.createdAt ?? r.created_at ?? new Date().toISOString())}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
