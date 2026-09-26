import React from 'react';
import { X, CheckCircle2, XCircle, Clock, FileText, DollarSign, Users, Layers, ShieldCheck } from 'lucide-react';
import type { PayrollBatch } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batch: PayrollBatch | null;
}

function formatAmount(amount: number, currency: string) {
  return `${currency} ${(amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export default function BatchDetailModal({ isOpen, onClose, batch }: Props) {
  if (!isOpen || !batch) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="page-eyebrow" style={{ marginBottom: 2 }}>
              <Layers size={13} /> {batch.batchNumber}
            </div>
            <div className="modal-title">{batch.title}</div>
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
            <div className="stat-tile">
              <div className="stat-tile-icon"><Users size={16} /></div>
              <div className="stat-tile-value" style={{ fontSize: '1.4rem' }}>{batch.totalEmployees}</div>
              <div className="stat-tile-label">Total Employees</div>
            </div>
            <div className="stat-tile green">
              <div className="stat-tile-icon"><CheckCircle2 size={16} /></div>
              <div className="stat-tile-value green" style={{ fontSize: '1.4rem' }}>{batch.successCount}</div>
              <div className="stat-tile-label">Successful</div>
            </div>
            <div className="stat-tile rose">
              <div className="stat-tile-icon"><XCircle size={16} /></div>
              <div className="stat-tile-value rose" style={{ fontSize: '1.4rem' }}>{batch.failedCount}</div>
              <div className="stat-tile-label">Failed</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile-icon"><DollarSign size={16} /></div>
              <div className="stat-tile-value" style={{ fontSize: '1.25rem' }}>
                ₹{((batch.totalAmount || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="stat-tile-label">Batch Total</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>
              Individual Payment Records ({batch.items?.length || 0})
            </div>
            <div className="table-shell" style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Emp ID</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Amount</th>
                    <th>Payment ID</th>
                    <th>Safety Key</th>
                  </tr>
                </thead>
                <tbody>
                  {(batch.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.status === 'SUCCEEDED' ? (
                          <span className="badge badge-success">
                            <CheckCircle2 size={11} /> Paid
                          </span>
                        ) : item.status === 'FAILED' ? (
                          <span className="badge badge-danger">
                            <XCircle size={11} /> Failed
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            <Clock size={11} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="td-mono">{item.employeeCode || item.employeeId?.slice(0, 8)}</td>
                      <td style={{ fontWeight: 600 }}>{item.employeeName || '—'}</td>
                      <td>{item.department || '—'}</td>
                      <td style={{ fontWeight: 700 }}>
                        {formatAmount(item.amount, item.currency)}
                      </td>
                      <td className="td-mono td-truncate" title={item.paymentId || ''}>
                        {item.paymentId ? item.paymentId.slice(0, 16) + '…' : '—'}
                      </td>
                      <td className="td-mono td-truncate" title={item.idempotencyKey || ''}>
                        {item.idempotencyKey ? item.idempotencyKey.slice(0, 20) + '…' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="alert alert-info">
            <span className="alert-icon"><ShieldCheck size={16} /></span>
            <span>
              All transactions in this batch are protected by individual deterministic idempotency safety keys. Re-running the batch will safely return existing payments without duplicate charges.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
