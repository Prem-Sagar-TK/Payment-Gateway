import React, { useState } from 'react';
import {
  Users, Search, Filter, Plus, UploadCloud, Download, Edit2, Trash2,
  CheckCircle2, AlertCircle, RefreshCw, DollarSign, Building, Mail, Phone, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import type { Employee } from '../types';
import EmployeeModal from '../components/EmployeeModal';
import CsvImportModal from '../components/CsvImportModal';

interface Props {
  employees: Employee[];
  loading: boolean;
  onRefresh: () => void;
  onInitiatePayroll: (selectedEmployeeIds: string[]) => void;
}

const DEPARTMENTS = [
  'ALL',
  'Engineering',
  'Product',
  'Design',
  'Finance',
  'Marketing',
  'Operations',
  'Human Resources',
  'Sales',
];

export default function EmployeesPage({
  employees,
  loading,
  onRefresh,
  onInitiatePayroll,
}: Props) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [csvModalOpen, setCsvModalOpen] = useState(false);

  // Filter employees
  const filtered = employees.filter((emp) => {
    const matchesDept = department === 'ALL' || emp.department === department;
    const matchesStatus = statusFilter === 'ALL' || emp.status === statusFilter;
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      emp.name.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q) ||
      emp.department.toLowerCase().includes(q);

    return matchesDept && matchesStatus && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  const handleSaveEmployee = async (data: Partial<Employee>) => {
    try {
      if (editingEmployee) {
        const res = await api.updateEmployee(editingEmployee.id, data);
        if (res.success) {
          toast.success(`Updated ${res.data?.data?.name}`);
          onRefresh();
        } else {
          toast.error(res.error?.message || 'Failed to update employee');
        }
      } else {
        const res = await api.createEmployee(data);
        if (res.success) {
          toast.success(`Created ${res.data?.data?.name} (${res.data?.data?.employeeId})`);
          onRefresh();
        } else {
          toast.error(res.error?.message || 'Failed to create employee');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Server error');
    }
  };

  const handleDeleteEmployee = async (emp: Employee) => {
    if (!window.confirm(`Are you sure you want to remove ${emp.name} (${emp.employeeId})?`)) return;
    try {
      const res = await api.deleteEmployee(emp.id);
      if (res.success) {
        toast.success(`Removed ${emp.name}`);
        onRefresh();
      } else {
        toast.error(res.error?.message || 'Failed to delete employee');
      }
    } catch (err: any) {
      toast.error(err.message || 'Server error');
    }
  };

  const handleExportCsv = () => {
    if (employees.length === 0) {
      toast.error('No employees to export');
      return;
    }
    const headers = ['employeeId', 'name', 'email', 'phone', 'department', 'designation', 'salary', 'currency', 'bankName', 'accountNumber', 'ifscCode', 'status', 'paymentStatus'];
    const rows = (selectedIds.size > 0 ? employees.filter((e) => selectedIds.has(e.id)) : employees).map((e) => [
      e.employeeId,
      `"${e.name.replace(/"/g, '""')}"`,
      e.email,
      e.phone || '',
      `"${e.department}"`,
      `"${e.designation.replace(/"/g, '""')}"`,
      (e.salary / 100).toFixed(0),
      e.currency,
      `"${e.bankName || ''}"`,
      `"${e.accountNumber || ''}"`,
      e.ifscCode || '',
      e.status,
      e.paymentStatus,
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employees_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Roster exported to CSV');
  };

  const handleBulkImportApi = async (data: Partial<Employee>[]) => {
    const res = await api.bulkImportEmployees(data);
    if (!res.success) {
      throw new Error(res.error?.message || 'Import failed');
    }
    return res.data?.data as any;
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div className="page-eyebrow">
            <Users size={14} />
            Employee Management
          </div>
          <h1 className="page-title">Employee Roster &amp; Salaries</h1>
          <p className="page-desc">
            Manage company employees, compensation structures, masked banking identifiers, and select staff for batch payroll disbursements.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setCsvModalOpen(true)}>
            <UploadCloud size={15} /> Import CSV
          </button>
          <button className="btn btn-secondary" onClick={handleExportCsv}>
            <Download size={15} /> Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingEmployee(null);
              setModalOpen(true);
            }}
          >
            <Plus size={16} /> Add Employee
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="g-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 260 }}>
            <div className="input-group" style={{ flex: 1 }}>
              <input
                placeholder="Search by name, ID, email, or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              style={{ width: 180 }}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</option>
              ))}
            </select>
            <select
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {selectedIds.size > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onInitiatePayroll(Array.from(selectedIds))}
              >
                <DollarSign size={14} /> Pay Selected ({selectedIds.size}) <ArrowRight size={13} />
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="g-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-shell" style={{ border: 'none', borderRadius: 0 }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.size === filtered.length}
                    onChange={selectAll}
                    style={{ cursor: 'pointer', width: 16, height: 16 }}
                  />
                </th>
                <th>Employee</th>
                <th>Department &amp; Role</th>
                <th>Monthly Salary</th>
                <th>Bank Identifier</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                    No employees matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const isSelected = selectedIds.has(emp.id);
                  return (
                    <tr key={emp.id} style={{ background: isSelected ? 'var(--green-bg)' : '#ffffff' }}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(emp.id)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{emp.name}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 2 }}>
                          <span className="td-mono text-xs text-muted">{emp.employeeId}</span>
                          <span className="text-xs text-muted">•</span>
                          <span className="text-xs text-muted">{emp.email}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{emp.designation}</div>
                        <div className="text-xs text-muted">{emp.department}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {emp.currency} {(emp.salary / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">{emp.bankName || 'HDFC Bank'}</div>
                        <div className="td-mono text-xs text-muted">{emp.accountNumber || '•••• 4821'}</div>
                      </td>
                      <td>
                        <span className={`badge ${emp.paymentStatus === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                          {emp.paymentStatus === 'PAID' ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
                          {emp.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn-icon"
                            title="Edit Employee"
                            onClick={() => {
                              setEditingEmployee(emp);
                              setModalOpen(true);
                            }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn-icon"
                            title="Delete Employee"
                            style={{ color: 'var(--rose)' }}
                            onClick={() => handleDeleteEmployee(emp)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EmployeeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveEmployee}
        employee={editingEmployee}
      />

      <CsvImportModal
        isOpen={csvModalOpen}
        onClose={() => setCsvModalOpen(false)}
        onImportSuccess={() => onRefresh()}
        onBulkImport={handleBulkImportApi}
      />
    </div>
  );
}
