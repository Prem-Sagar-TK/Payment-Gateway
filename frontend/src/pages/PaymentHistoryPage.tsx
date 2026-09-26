import React, { useState } from 'react';
import {
  History, RefreshCw, CheckCircle2, XCircle, Clock, RotateCcw,
  DollarSign, Inbox, CreditCard, Layers, Eye, Users, Search
} from 'lucide-react';
import type { Payment, PayrollBatch } from '../types';
import BatchDetailModal from '../components/BatchDetailModal';

interface Props {
  payments: Payment[];
  batches: PayrollBatch[];
  loading: boolean;
  onRefresh: () => void;
  defaultTab?: 'payments' | 'batches';
  onRetryPayment?: (payment: Payment) => void;
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toFixed(2)}`;
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    SUCCEEDED: 'badge-success',
    SUCCESS: 'badge-success',
    COMPLETED: 'badge-success',
    FAILED: 'badge-danger',
    FAILURE: 'badge-danger',
    PROCESSING: 'badge-warning',
    PENDING: 'badge-warning',
    PARTIAL: 'badge-warning',
    REFUNDED: 'badge-info',
  };
  return map[status] ?? 'badge-muted';
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'SUCCEEDED' || status === 'SUCCESS' || status === 'COMPLETED') return <CheckCircle2 size={12} />;
  if (status === 'FAILED' || status === 'FAILURE') return <XCircle size={12} />;
  if (status === 'PROCESSING' || status === 'PENDING' || status === 'PARTIAL') return <Clock size={12} />;
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

export default function PaymentHistoryPage({
  payments,
  batches,
  loading,
  onRefresh,
  defaultTab = 'payments',
  onRetryPayment,
}: Props) {
  const [activeTab, setActiveTab] = useState<'payments' | 'batches'>(defaultTab);
  const [search, setSearch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<PayrollBatch | null>(null);

  const successCount = payments.filter((p) => p.status === 'SUCCEEDED' || p.status === 'SUCCESS').length;
  const failCount = payments.filter((p) => p.status === 'FAILED' || p.status === 'FAILURE').length;
  const totalValue = payments.reduce((s, p) => s + (p.status === 'SUCCEEDED' || p.status === 'SUCCESS' ? p.amount : 0), 0);

  const filteredPayments = payments.filter((p) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      p.id.toLowerCase().includes(q) ||
      (p.customerId || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  });

  const filteredBatches = batches.filter((b) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      b.title.toLowerCase().includes(q) ||
      b.batchNumber.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="page-eyebrow">
              <History size={14} />
              Payment Records
            </div>
            <h1 className="page-title">Payment &amp; Payroll History</h1>
            <p className="page-desc">
              Audit both individual gateway transactions and company-wide bulk payroll batches.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? <span className="spinner" /> : <RefreshCw size={15} />}
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="stats-row">
        <div className="stat-tile">
          <div className="stat-tile-icon"><CreditCard size={18} /></div>
          <div className="stat-tile-value">{payments.length}</div>
          <div className="stat-tile-label">Individual Transactions</div>
        </div>

        <div className="stat-tile">
          <div className="stat-tile-icon"><Layers size={18} /></div>
          <div className="stat-tile-value">{batches.length}</div>
          <div className="stat-tile-label">Payroll Batches</div>
        </div>

        <div className="stat-tile green">
          <div className="stat-tile-icon"><CheckCircle2 size={18} /></div>
          <div className="stat-tile-value green">{successCount}</div>
          <div className="stat-tile-label">Successful Payments</div>
        </div>

        <div className="stat-tile">
          <div className="stat-tile-icon"><DollarSign size={18} /></div>
          <div className="stat-tile-value" style={{ fontSize: '1.4rem' }}>
            ₹{(totalValue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="stat-tile-label">Total Disbursed Volume</div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={16} /> Individual Payments ({payments.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'batches' ? 'active' : ''}`}
          onClick={() => setActiveTab('batches')}
        >
          <Layers size={16} /> Company Payroll Batches ({batches.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="g-card" style={{ padding: '12px 18px', marginBottom: 16 }}>
        <div className="input-group" style={{ maxWidth: 360 }}>
          <input
            placeholder={activeTab === 'payments' ? 'Search by Payment ID, customer, description...' : 'Search by Batch title or number...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px', fontSize: '0.85rem' }}
          />
        </div>
      </div>

      {/* TAB 1: INDIVIDUAL PAYMENTS */}
      {activeTab === 'payments' && (
        <>
          {filteredPayments.length === 0 ? (
            <div className="g-card">
              <div className="empty-state">
                <div className="empty-state-icon"><Inbox size={36} /></div>
                <div className="empty-state-title">No payment records found</div>
                <div className="empty-state-desc">
                  Create a single charge in "Send Money" or disburse payroll to generate transaction records.
                </div>
              </div>
            </div>
          ) : (
            <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-shell" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Amount</th>
                      <th>Customer / Recipient</th>
                      <th>Description</th>
                      <th>Payment ID</th>
                      <th>Time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
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
                        <td className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.description ?? '—'}
                        </td>
                        <td className="td-mono td-truncate" title={p.id}>
                          {p.id.slice(0, 20)}…
                        </td>
                        <td className="text-sm" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(p.createdAt ?? p.created_at ?? new Date().toISOString())}
                        </td>
                        <td>
                          {(p.status === 'FAILED' || p.status === 'FAILURE') && onRetryPayment && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => onRetryPayment(p)}
                              title="Retry failed payment with original safety key"
                            >
                              <RotateCcw size={12} /> Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* TAB 2: COMPANY PAYROLL BATCHES */}
      {activeTab === 'batches' && (
        <>
          {filteredBatches.length === 0 ? (
            <div className="g-card">
              <div className="empty-state">
                <div className="empty-state-icon"><Layers size={36} /></div>
                <div className="empty-state-title">No payroll batches found</div>
                <div className="empty-state-desc">
                  Run a payroll disbursement in the "Payroll" tab to generate batch records.
                </div>
              </div>
            </div>
          ) : (
            <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-shell" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Batch Title &amp; ID</th>
                      <th>Total Employees</th>
                      <th>Total Amount</th>
                      <th>Success / Failed</th>
                      <th>Processed Date</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <span className={`badge ${statusBadge(b.status)}`}>
                            <StatusIcon status={b.status} /> {b.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.title}</div>
                          <div className="td-mono text-xs text-muted">{b.batchNumber}</div>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
                          {b.totalEmployees} Employees
                        </td>
                        <td style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {b.currency} {((b.totalAmount || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span className="badge badge-success" style={{ marginRight: 6 }}>
                            {b.successCount} Paid
                          </span>
                          {b.failedCount > 0 && (
                            <span className="badge badge-danger">
                              {b.failedCount} Failed
                            </span>
                          )}
                        </td>
                        <td className="text-sm" style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(b.createdAt ?? new Date().toISOString())}
                        </td>
                        <td>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedBatch(b)}
                          >
                            <Eye size={13} /> View Batch
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Batch Detail Breakdown Modal */}
      <BatchDetailModal
        isOpen={Boolean(selectedBatch)}
        onClose={() => setSelectedBatch(null)}
        batch={selectedBatch}
      />
    </div>
  );
}
