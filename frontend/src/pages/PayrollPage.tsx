import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, CheckCircle2, AlertTriangle, Play, RotateCcw,
  Users, DollarSign, ShieldCheck, Search, Filter, ArrowRight, ArrowLeft,
  Edit2, Check, Lock, Building, Layers, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Employee, PayrollBatch, PayrollItem } from '../types';

interface Props {
  employees: Employee[];
  initialSelectedIds?: string[];
  onPayrollComplete: () => void;
  onNavigateHistory: () => void;
}

interface EditableEmployeeRow extends Employee {
  isSelected: boolean;
  isValid: boolean;
  validationIssues: string[];
}

export default function PayrollPage({
  employees: initialEmployees,
  initialSelectedIds = [],
  onPayrollComplete,
  onNavigateHistory,
}: Props) {
  const [step, setStep] = useState<'spreadsheet' | 'review' | 'processing' | 'completed'>('spreadsheet');
  const [rows, setRows] = useState<EditableEmployeeRow[]>([]);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [batchTitle, setBatchTitle] = useState(() => {
    const month = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return `${month} Employee Payroll`;
  });

  const [processingBatch, setProcessingBatch] = useState<PayrollBatch | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Initialize editable rows from employees
  useEffect(() => {
    const initialSet = new Set(initialSelectedIds.length > 0 ? initialSelectedIds : initialEmployees.filter((e) => e.status === 'ACTIVE').map((e) => e.id));

    const mapped = initialEmployees.map((emp) => {
      const issues: string[] = [];
      if (emp.salary <= 0) issues.push('Salary must be > 0');
      if (!emp.name) issues.push('Name missing');
      if (!emp.accountNumber) issues.push('Missing bank identifier');

      return {
        ...emp,
        isSelected: initialSet.has(emp.id),
        isValid: issues.length === 0,
        validationIssues: issues,
      };
    });

    setRows(mapped);
  }, [initialEmployees, initialSelectedIds]);

  const toggleSelect = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isSelected: !r.isSelected } : r))
    );
  };

  const selectAll = () => {
    const visibleRows = filteredRows;
    const allSelected = visibleRows.every((r) => r.isSelected);
    setRows((prev) =>
      prev.map((r) => {
        if (visibleRows.some((vr) => vr.id === r.id)) {
          return { ...r, isSelected: !allSelected };
        }
        return r;
      })
    );
  };

  const startEdit = (id: string, field: string, currentValue: any) => {
    setEditingCell({ id, field });
    if (field === 'salary') {
      setEditValue(String((currentValue / 100).toFixed(0)));
    } else {
      setEditValue(String(currentValue || ''));
    }
  };

  const saveEdit = (id: string, field: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;

        let updated = { ...r };
        if (field === 'salary') {
          const num = Math.round(parseFloat(editValue || '0') * 100);
          updated.salary = isNaN(num) || num <= 0 ? r.salary : num;
        } else if (field === 'name') {
          updated.name = editValue.trim() || r.name;
        } else if (field === 'designation') {
          updated.designation = editValue.trim() || r.designation;
        } else if (field === 'accountNumber') {
          updated.accountNumber = editValue.trim() || r.accountNumber;
        }

        // Re-validate
        const issues: string[] = [];
        if (updated.salary <= 0) issues.push('Salary must be > 0');
        if (!updated.name) issues.push('Name missing');
        if (!updated.accountNumber) issues.push('Missing bank identifier');

        updated.isValid = issues.length === 0;
        updated.validationIssues = issues;

        return updated;
      })
    );

    setEditingCell(null);
  };

  // Filter rows
  const filteredRows = rows.filter((r) => {
    const matchesDept = deptFilter === 'ALL' || r.department === deptFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.employeeId.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.designation.toLowerCase().includes(q);

    return matchesDept && matchesSearch;
  });

  const selectedRows = rows.filter((r) => r.isSelected);
  const selectedValidRows = selectedRows.filter((r) => r.isValid);
  const totalSelectedAmount = selectedRows.reduce((sum, r) => sum + r.salary, 0);
  const totalWarningsCount = selectedRows.filter((r) => !r.isValid).length;

  const handleProcessPayroll = async () => {
    if (selectedValidRows.length === 0) {
      toast.error('Please select at least one valid employee to pay');
      return;
    }

    setStep('processing');
    setIsExecuting(true);

    try {
      const res = await api.processPayroll({
        title: batchTitle,
        employeeIds: selectedValidRows.map((r) => r.id),
      });

      if (res.success && res.data?.data) {
        setProcessingBatch(res.data.data);
        setStep('completed');
        toast.success(`Payroll processed for ${res.data.data.totalEmployees} employees!`);
        onPayrollComplete();
      } else {
        toast.error(res.error?.message || 'Payroll processing failed');
        setStep('review');
      }
    } catch (err: any) {
      toast.error(`Error executing payroll: ${err.message}`);
      setStep('review');
    } finally {
      setIsExecuting(false);
    }
  };

  const departments = ['ALL', ...Array.from(new Set(rows.map((r) => r.department)))];

  return (
    <div>
      {/* Workflow Progress Navigation Bar */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-eyebrow">
          <FileSpreadsheet size={14} />
          Company Payroll Workflow
        </div>
        <h1 className="page-title">Spreadsheet Verification &amp; Bulk Payout</h1>
        <p className="page-desc">
          Review employee compensation in spreadsheet view, edit values inline, verify banking status, and disburse payroll through the gateway.
        </p>
      </div>

      {/* 3-Step Wizard Navigation Indicator */}
      <div className="how-steps" style={{ marginBottom: 24 }}>
        <div className={`how-step ${step === 'spreadsheet' ? 'active' : ''}`} style={{ borderColor: step === 'spreadsheet' ? 'var(--green)' : 'var(--border)' }}>
          <div className="how-step-num" style={{ background: step === 'spreadsheet' ? 'var(--green)' : 'var(--black)' }}>1</div>
          <span><strong>Spreadsheet Verification</strong></span>
        </div>
        <div className={`how-step ${step === 'review' ? 'active' : ''}`} style={{ borderColor: step === 'review' ? 'var(--green)' : 'var(--border)' }}>
          <div className="how-step-num" style={{ background: step === 'review' ? 'var(--green)' : 'var(--black)' }}>2</div>
          <span><strong>Approval &amp; Batch Review</strong></span>
        </div>
        <div className={`how-step ${step === 'processing' || step === 'completed' ? 'active' : ''}`} style={{ borderColor: step === 'completed' ? 'var(--green)' : 'var(--border)' }}>
          <div className="how-step-num" style={{ background: step === 'completed' ? 'var(--green)' : 'var(--black)' }}>3</div>
          <span><strong>Execution &amp; Settlement</strong></span>
        </div>
      </div>

      {/* STEP 1: SPREADSHEET VERIFICATION */}
      {step === 'spreadsheet' && (
        <>
          {/* Summary Stats Row */}
          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
            <div className="stat-tile">
              <div className="stat-tile-icon"><Users size={16} /></div>
              <div className="stat-tile-value" style={{ fontSize: '1.45rem' }}>{selectedRows.length} of {rows.length}</div>
              <div className="stat-tile-label">Selected for Payout</div>
            </div>

            <div className="stat-tile green">
              <div className="stat-tile-icon"><DollarSign size={16} /></div>
              <div className="stat-tile-value green" style={{ fontSize: '1.45rem' }}>
                ₹{(totalSelectedAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="stat-tile-label">Total Batch Value</div>
            </div>

            <div className="stat-tile">
              <div className="stat-tile-icon"><CheckCircle2 size={16} /></div>
              <div className="stat-tile-value" style={{ fontSize: '1.45rem' }}>{selectedValidRows.length}</div>
              <div className="stat-tile-label">Ready to Disburse</div>
            </div>

            <div className={`stat-tile ${totalWarningsCount > 0 ? 'rose' : 'green'}`}>
              <div className="stat-tile-icon"><AlertTriangle size={16} /></div>
              <div className={`stat-tile-value ${totalWarningsCount > 0 ? 'rose' : 'green'}`} style={{ fontSize: '1.45rem' }}>
                {totalWarningsCount}
              </div>
              <div className="stat-tile-label">Verification Warnings</div>
            </div>
          </div>

          {/* Spreadsheet Table Card */}
          <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="spreadsheet-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div className="input-group" style={{ width: 240 }}>
                  <input
                    placeholder="Search spreadsheet..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  />
                </div>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  style={{ width: 170, padding: '6px 10px', fontSize: '0.8rem' }}
                >
                  {departments.map((d) => (
                    <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>
                  ))}
                </select>
                <button className="btn btn-secondary btn-sm" onClick={selectAll}>
                  {filteredRows.every((r) => r.isSelected) ? 'Deselect All' : 'Select All Filtered'}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="text-xs text-muted">
                  Tip: Click on any <strong>Salary</strong> cell to edit inline
                </span>
                <button
                  className="btn btn-primary"
                  disabled={selectedValidRows.length === 0}
                  onClick={() => setStep('review')}
                >
                  Proceed to Review ({selectedValidRows.length}) <ArrowRight size={14} />
                </button>
              </div>
            </div>

            <div className="table-shell" style={{ border: 'none', borderRadius: 0, maxHeight: 480, overflowY: 'auto' }}>
              <table className="spreadsheet-table">
                <thead>
                  <tr>
                    <th style={{ width: 36, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={filteredRows.length > 0 && filteredRows.every((r) => r.isSelected)}
                        onChange={selectAll}
                        style={{ cursor: 'pointer', width: 15, height: 15 }}
                      />
                    </th>
                    <th style={{ width: 90 }}>Employee ID</th>
                    <th>Employee Name</th>
                    <th>Department</th>
                    <th>Designation</th>
                    <th style={{ width: 150 }}>Salary / Amount (Edit)</th>
                    <th style={{ width: 70 }}>Currency</th>
                    <th>Bank Identifier</th>
                    <th>Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                        No records match criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr
                        key={row.id}
                        className={`${row.isSelected ? 'selected' : ''} ${!row.isValid ? 'has-warning' : ''}`}
                      >
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={row.isSelected}
                            onChange={() => toggleSelect(row.id)}
                            style={{ cursor: 'pointer', width: 15, height: 15 }}
                          />
                        </td>
                        <td className="td-mono text-xs">{row.employeeId}</td>
                        <td>
                          {editingCell?.id === row.id && editingCell?.field === 'name' ? (
                            <input
                              className="editable-input"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(row.id, 'name')}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(row.id, 'name')}
                            />
                          ) : (
                            <div
                              className="editable-cell"
                              onClick={() => startEdit(row.id, 'name', row.name)}
                              title="Click to edit name"
                            >
                              <strong>{row.name}</strong>
                            </div>
                          )}
                        </td>
                        <td>{row.department}</td>
                        <td>
                          {editingCell?.id === row.id && editingCell?.field === 'designation' ? (
                            <input
                              className="editable-input"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(row.id, 'designation')}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(row.id, 'designation')}
                            />
                          ) : (
                            <div
                              className="editable-cell"
                              onClick={() => startEdit(row.id, 'designation', row.designation)}
                              title="Click to edit role"
                            >
                              {row.designation}
                            </div>
                          )}
                        </td>
                        <td>
                          {editingCell?.id === row.id && editingCell?.field === 'salary' ? (
                            <input
                              type="number"
                              className="editable-input"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(row.id, 'salary')}
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(row.id, 'salary')}
                            />
                          ) : (
                            <div
                              className="editable-cell"
                              onClick={() => startEdit(row.id, 'salary', row.salary)}
                              title="Click to edit salary amount"
                              style={{ fontWeight: 700, color: 'var(--green-dark)' }}
                            >
                              {(row.salary / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              <Edit2 size={11} style={{ marginLeft: 6, opacity: 0.5 }} />
                            </div>
                          )}
                        </td>
                        <td className="td-mono text-xs">{row.currency}</td>
                        <td>
                          <div className="td-mono text-xs">{row.bankName || 'HDFC'} • {row.accountNumber || '•••• 4821'}</div>
                        </td>
                        <td>
                          {row.isValid ? (
                            <span className="badge badge-success">
                              <CheckCircle2 size={11} /> Verified
                            </span>
                          ) : (
                            <span className="badge badge-danger" title={row.validationIssues.join(', ')}>
                              <AlertTriangle size={11} /> {row.validationIssues[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* STEP 2: APPROVAL & BATCH REVIEW */}
      {step === 'review' && (
        <div>
          <div className="g-card" style={{ marginBottom: 24 }}>
            <div className="g-card-header">
              <div className="g-card-icon green">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="g-card-title">Payroll Batch Authorization</div>
                <div className="g-card-subtitle">
                  Verify the payout summary and grant authorization before execution.
                </div>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 24 }}>
              <label className="field-label">
                <span className="field-label-icon"><Layers size={14} /></span>
                Payroll Batch Title
              </label>
              <input
                value={batchTitle}
                onChange={(e) => setBatchTitle(e.target.value)}
                placeholder="e.g. September 2026 Employee Payroll"
                style={{ fontWeight: 600 }}
              />
            </div>

            <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
              <div className="stat-tile">
                <div className="stat-tile-icon"><Users size={16} /></div>
                <div className="stat-tile-value">{selectedValidRows.length}</div>
                <div className="stat-tile-label">Employees to Pay</div>
              </div>

              <div className="stat-tile green">
                <div className="stat-tile-icon"><DollarSign size={16} /></div>
                <div className="stat-tile-value green">
                  ₹{(totalSelectedAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div className="stat-tile-label">Total Payment Amount</div>
              </div>

              <div className="stat-tile">
                <div className="stat-tile-icon"><ShieldCheck size={16} /></div>
                <div className="stat-tile-value" style={{ fontSize: '1.2rem', color: 'var(--green-dark)' }}>
                  Zero-Duplicate
                </div>
                <div className="stat-tile-label">Idempotency Protected</div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>
                Individual Payout Breakdown ({selectedValidRows.length} Employees)
              </div>
              <div className="table-shell" style={{ maxHeight: 260, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Emp ID</th>
                      <th>Employee</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedValidRows.map((r) => (
                      <tr key={r.id}>
                        <td className="td-mono text-xs">{r.employeeId}</td>
                        <td style={{ fontWeight: 600 }}>{r.name}</td>
                        <td>{r.department}</td>
                        <td className="text-sm">{r.designation}</td>
                        <td style={{ fontWeight: 700 }}>
                          {r.currency} {(r.salary / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setStep('spreadsheet')}>
                <ArrowLeft size={15} /> Back to Spreadsheet
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleProcessPayroll}
                disabled={isExecuting}
              >
                {isExecuting ? <span className="spinner" /> : <Play size={18} />}
                Confirm &amp; Disburse Batch Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: PROCESSING / COMPLETED */}
      {step === 'processing' && (
        <div className="g-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Disbursing Employee Payroll...</h2>
          <p className="text-sm text-muted" style={{ maxWidth: 460, margin: '0 auto' }}>
            Processing payments through the idempotent payment gateway with deterministic safety keys. Please do not close this window.
          </p>
        </div>
      )}

      {step === 'completed' && processingBatch && (
        <div>
          <div className="g-card" style={{ background: 'var(--green-bg)', borderColor: 'var(--green-border)', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div className="g-card-icon green" style={{ width: 44, height: 44 }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--green-dark)', marginBottom: 4 }}>
                  Payroll Batch Successfully Processed!
                </div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Batch <strong>{processingBatch.batchNumber}</strong> ("{processingBatch.title}") processed {processingBatch.successCount} of {processingBatch.totalEmployees} employee payments successfully for a total volume of <strong>₹{(processingBatch.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>.
                </div>
              </div>
            </div>
          </div>

          <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
            <div className="stat-tile green">
              <div className="stat-tile-icon"><CheckCircle2 size={16} /></div>
              <div className="stat-tile-value green">{processingBatch.successCount}</div>
              <div className="stat-tile-label">Successful Payments</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile-icon"><DollarSign size={16} /></div>
              <div className="stat-tile-value">
                ₹{(processingBatch.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="stat-tile-label">Total Disbursed</div>
            </div>
            <div className="stat-tile">
              <div className="stat-tile-icon"><Layers size={16} /></div>
              <div className="stat-tile-value td-mono" style={{ fontSize: '1.1rem' }}>{processingBatch.batchNumber}</div>
              <div className="stat-tile-label">Batch ID</div>
            </div>
          </div>

          <div className="g-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="g-card-title">Live Transaction Settlement Log</div>
            </div>
            <div className="table-shell" style={{ border: 'none', borderRadius: 0, maxHeight: 320, overflowY: 'auto' }}>
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
                  {(processingBatch.items || []).map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="badge badge-success">
                          <CheckCircle2 size={11} /> Paid
                        </span>
                      </td>
                      <td className="td-mono">{item.employeeCode}</td>
                      <td style={{ fontWeight: 600 }}>{item.employeeName}</td>
                      <td>{item.department}</td>
                      <td style={{ fontWeight: 700 }}>
                        {item.currency} {(item.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="td-mono td-truncate" title={item.paymentId || ''}>
                        {item.paymentId ? item.paymentId.slice(0, 18) + '…' : '—'}
                      </td>
                      <td className="td-mono td-truncate" title={item.idempotencyKey || ''}>
                        {item.idempotencyKey ? item.idempotencyKey.slice(0, 24) + '…' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={() => setStep('spreadsheet')}>
              <RotateCcw size={15} /> Start New Payroll Run
            </button>
            <button className="btn btn-primary" onClick={onNavigateHistory}>
              <Eye size={15} /> View Full Payment History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
