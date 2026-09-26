import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Briefcase, Building, DollarSign, CreditCard } from 'lucide-react';
import type { Employee } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<Employee>) => Promise<void>;
  employee?: Employee | null;
}

const DEPARTMENTS = [
  'Engineering',
  'Product',
  'Design',
  'Finance',
  'Marketing',
  'Operations',
  'Human Resources',
  'Sales',
  'Legal',
  'Customer Support',
];

export default function EmployeeModal({ isOpen, onClose, onSave, employee }: Props) {
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    department: 'Engineering',
    designation: '',
    salary: '85000',
    currency: 'INR',
    bankName: 'HDFC Bank',
    accountNumber: '',
    ifscCode: 'HDFC0001234',
    status: 'ACTIVE' as const,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (employee) {
      setFormData({
        employeeId: employee.employeeId || '',
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        department: employee.department || 'Engineering',
        designation: employee.designation || '',
        salary: String((employee.salary / 100).toFixed(0)),
        currency: employee.currency || 'INR',
        bankName: employee.bankName || 'HDFC Bank',
        accountNumber: employee.accountNumber || '',
        ifscCode: employee.ifscCode || 'HDFC0001234',
        status: (employee.status as any) || 'ACTIVE',
      });
    } else {
      setFormData({
        employeeId: '',
        name: '',
        email: '',
        phone: '',
        department: 'Engineering',
        designation: '',
        salary: '85000',
        currency: 'INR',
        bankName: 'HDFC Bank',
        accountNumber: '',
        ifscCode: 'HDFC0001234',
        status: 'ACTIVE',
      });
    }
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.designation.trim()) {
      return;
    }

    setSaving(true);
    try {
      const salaryInt = Math.round(parseFloat(formData.salary || '0') * 100);
      await onSave({
        employeeId: formData.employeeId ? formData.employeeId.trim() : undefined,
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        department: formData.department,
        designation: formData.designation.trim(),
        salary: salaryInt,
        currency: formData.currency,
        bankName: formData.bankName.trim() || undefined,
        accountNumber: formData.accountNumber.trim() || undefined,
        ifscCode: formData.ifscCode.trim() || undefined,
        status: formData.status,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            {employee ? `Edit Employee (${employee.employeeId})` : 'Add New Employee'}
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid" style={{ gap: '16px' }}>
              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><User size={14} /></span>
                  Employee ID (optional)
                </label>
                <input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="e.g. EMP-115 (auto-generated if empty)"
                  disabled={Boolean(employee)}
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><User size={14} /></span>
                  Full Name *
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Maya Krishnan"
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><Mail size={14} /></span>
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="maya.k@paygate.corp"
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><Phone size={14} /></span>
                  Phone Number
                </label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 98765 00000"
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><Building size={14} /></span>
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><Briefcase size={14} /></span>
                  Designation / Role *
                </label>
                <input
                  required
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Senior Security Engineer"
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><DollarSign size={14} /></span>
                  Monthly Salary / Payout Amount *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="85000"
                />
                <div className="field-hint">In standard currency units (e.g. ₹85,000)</div>
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><DollarSign size={14} /></span>
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                >
                  {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><CreditCard size={14} /></span>
                  Bank Name
                </label>
                <input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="HDFC Bank"
                />
              </div>

              <div className="field">
                <label className="field-label">
                  <span className="field-label-icon"><CreditCard size={14} /></span>
                  Account Identifier / Masked No.
                </label>
                <input
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="•••• 4821 or full account number"
                />
              </div>

              <div className="field">
                <label className="field-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-secondary" type="button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              {employee ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
