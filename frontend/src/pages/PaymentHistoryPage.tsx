import React from 'react';
import {
  History, RefreshCw, CheckCircle2, XCircle, Clock, RotateCcw,
  DollarSign, Inbox, CreditCard
} from 'lucide-react';
import type { Payment } from '../types';

interface Props {
  payments: Payment[];
  loading: boolean;
  onRefresh: () => void;
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SUCCEEDED: 'badge-success',
    SUCCESS: 'badge-success',
    FAILED: 'badge-danger',
    FAILURE: 'badge-danger',
    PROCESSING: 'badge-warning',
    PENDING: 'badge-warning',
    REFUNDED: 'badge-info',
  };
  return map[status] ?? 'badge-muted';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'SUCCEEDED' || status === 'SUCCESS') return <CheckCircle2 size={12} />;
  if (status === 'FAILED' || status === 'FAILURE') return <XCircle size={12} />;
  if (status === 'PROCESSING' || status === 'PENDING') return <Clock size={12} />;
  if (status === 'REFUNDED') return <RotateCcw size={12} />;
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

export default function PaymentHistoryPage({ payments, loading, onRefresh }: Props) {
  const successCount = payments.filter(p => p.status === 'SUCCEEDED' || p.status === 'SUCCESS').length;
  const failCount = payments.filter(p => p.status === 'FAILED' || p.status === 'FAILURE').length;
  const totalValue = payments.reduce((s, p) => s + (p.status === 'SUCCEEDED' || p.status === 'SUCCESS' ? p.amount : 0), 0);

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-eyebrow">
              <History size={14} />
              Payment History
            </div>
            <h1 className="page-title">All Payments</h1>
            <p className="page-desc">A live ledger of every payment transaction processed through the gateway.</p>
          </div>
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? <span className="spinner" /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-tile">
          <div className="stat-tile-icon"><CreditCard size={18} /></div>
          <div className="stat-tile-value">{payments.length}</div>
          <div className="stat-tile-label">Total Payments</div>
        </div>
        <div className="stat-tile green">
          <div className="stat-tile-icon"><CheckCircle2 size={18} /></div>
          <div className="stat-tile-value green">{successCount}</div>
          <div className="stat-tile-label">Successful</div>
        </div>
        <div className="stat-tile rose">
          <div className="stat-tile-icon"><XCircle size={18} /></div>
          <div className="stat-tile-value rose">{failCount}</div>
          <div className="stat-tile-label">Failed</div>
        </div>
        <div className="stat-tile">
          <div className="stat-tile-icon"><DollarSign size={18} /></div>
          <div className="stat-tile-value" style={{ fontSize: '1.5rem' }}>
            ₹{(totalValue / 100).toFixed(0)}
          </div>
          <div className="stat-tile-label">Total Collected</div>
          <div className="stat-tile-hint">Successful only</div>
        </div>
      </div>

      {/* Table */}
      {payments.length === 0 ? (
        <div className="g-card">
          <div className="empty-state">
            <div className="empty-state-icon"><Inbox size={36} /></div>
            <div className="empty-state-title">No payments yet</div>
            <div className="empty-state-desc">
              Go to "Send Money" to create your first payment. It will appear here instantly.
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
                  <th>Amount</th>
                  <th>Customer</th>
                  <th>Description</th>
                  <th>Payment ID</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <span className={`badge ${statusBadge(p.status)}`}>
                        <StatusIcon status={p.status} /> {p.status}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {formatAmount(p.amount, p.currency)}
                    </td>
                    <td className="td-mono text-sm">{p.customerId ?? p.customer_id ?? '—'}</td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.description ?? '—'}
                    </td>
                    <td className="td-mono td-truncate" title={p.id}>
                      {p.id.slice(0, 20)}…
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(p.createdAt ?? p.created_at ?? new Date().toISOString())}
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
