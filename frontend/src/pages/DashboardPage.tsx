import React from 'react';
import {
  LayoutDashboard, Users, CreditCard, DollarSign, CheckCircle2,
  XCircle, Clock, Zap, ArrowRight, ShieldCheck, Plus, RefreshCw, Layers
} from 'lucide-react';
import type { Payment, Employee, PayrollBatch } from '../types';

interface Props {
  employees: Employee[];
  payments: Payment[];
  batches: PayrollBatch[];
  loading: boolean;
  onNavigate: (page: string, params?: any) => void;
  onRefresh: () => void;
}

function formatCurrency(amountPaise: number, currency = 'INR') {
  return `${currency} ${(amountPaise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function DashboardPage({
  employees,
  payments,
  batches,
  loading,
  onNavigate,
  onRefresh,
}: Props) {
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const paidEmployees = employees.filter((e) => e.paymentStatus === 'PAID');
  const pendingEmployees = employees.filter((e) => e.paymentStatus === 'PENDING' && e.status === 'ACTIVE');
  
  const totalPayrollEstimate = activeEmployees.reduce((sum, e) => sum + e.salary, 0);
  const totalAmountPaidInGateway = payments
    .filter((p) => p.status === 'SUCCEEDED' || p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  const successfulPayments = payments.filter((p) => p.status === 'SUCCEEDED' || p.status === 'SUCCESS').length;
  const failedPayments = payments.filter((p) => p.status === 'FAILED' || p.status === 'FAILURE').length;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-eyebrow">
            <LayoutDashboard size={14} />
            Company Overview
          </div>
          <h1 className="page-title">Payment &amp; Payroll Dashboard</h1>
          <p className="page-desc">
            Monitor real-time company disbursements, manage employee payroll batches, and oversee gateway transactions with zero-duplicate protection.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? <span className="spinner" /> : <RefreshCw size={14} />}
            Refresh Data
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('payroll')}>
            <DollarSign size={16} /> Run Payroll
          </button>
        </div>
      </div>

      {/* Main KPI Stats Row */}
      <div className="stats-row">
        <div className="stat-tile">
          <div className="stat-tile-icon"><Users size={18} /></div>
          <div className="stat-tile-value">{employees.length}</div>
          <div className="stat-tile-label">Total Employees</div>
          <div className="stat-tile-hint">{activeEmployees.length} active in roster</div>
        </div>

        <div className="stat-tile green">
          <div className="stat-tile-icon"><CheckCircle2 size={18} /></div>
          <div className="stat-tile-value green">{successfulPayments}</div>
          <div className="stat-tile-label">Completed Payments</div>
          <div className="stat-tile-hint">100% Idempotent guarantee</div>
        </div>

        <div className="stat-tile amber">
          <div className="stat-tile-icon"><Clock size={18} /></div>
          <div className="stat-tile-value amber">{pendingEmployees.length}</div>
          <div className="stat-tile-label">Pending Payroll</div>
          <div className="stat-tile-hint">Employees awaiting payout</div>
        </div>

        <div className="stat-tile">
          <div className="stat-tile-icon"><DollarSign size={18} /></div>
          <div className="stat-tile-value" style={{ fontSize: '1.5rem' }}>
            {formatCurrency(totalAmountPaidInGateway)}
          </div>
          <div className="stat-tile-label">Total Amount Disbursed</div>
          <div className="stat-tile-hint">Lifetime processed volume</div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="g-card" style={{ padding: '20px 24px', marginBottom: 24, background: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="g-card-icon green" style={{ width: 42, height: 42 }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Company Payroll &amp; Payment Operations
              </div>
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Upcoming Monthly Payroll Estimate: <strong>{formatCurrency(totalPayrollEstimate)}</strong> ({activeEmployees.length} employees)
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('employees')}>
              <Users size={14} /> Employee Roster
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('send')}>
              <CreditCard size={14} /> Send Single Payment
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => onNavigate('payroll')}>
              <DollarSign size={14} /> Spreadsheet Verification &amp; Pay <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Payroll Batches & Recent Gateway Payments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        
        {/* Recent Payroll Batches */}
        <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="g-card-title" style={{ fontSize: '0.95rem' }}>Recent Payroll Batches</div>
              <div className="g-card-subtitle">Bulk company employee disbursements</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('history', { tab: 'batches' })}
            >
              View All
            </button>
          </div>

          {batches.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Layers size={32} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <div style={{ fontWeight: 600 }}>No payroll batches processed yet</div>
              <div className="text-xs text-muted" style={{ marginTop: 4 }}>
                Navigate to "Payroll" to verify and process your first employee batch.
              </div>
            </div>
          ) : (
            <div className="table-shell" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Employees</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.slice(0, 5).map((b) => (
                    <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('history', { tab: 'batches' })}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{b.title}</div>
                        <div className="td-mono text-xs text-muted">{b.batchNumber}</div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{b.totalEmployees} staff</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(b.totalAmount, b.currency)}</td>
                      <td>
                        <span className={`badge ${b.status === 'COMPLETED' ? 'badge-success' : b.status === 'PARTIAL' ? 'badge-warning' : 'badge-danger'}`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Individual Gateway Payments */}
        <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="g-card-title" style={{ fontSize: '0.95rem' }}>Recent Gateway Transactions</div>
              <div className="g-card-subtitle">Live payment ledger activity</div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigate('history', { tab: 'payments' })}
            >
              View All
            </button>
          </div>

          {payments.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <CreditCard size={32} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <div style={{ fontWeight: 600 }}>No payments processed yet</div>
            </div>
          ) : (
            <div className="table-shell" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Recipient</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 5).map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className={`badge ${p.status === 'SUCCEEDED' || p.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {p.currency} {(p.amount / 100).toFixed(2)}
                      </td>
                      <td className="td-mono text-xs">{p.customerId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
