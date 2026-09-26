import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Employee } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (importedCount: number) => void;
  onBulkImport: (employees: Partial<Employee>[]) => Promise<{ imported: number; created: number; updated: number; errors: any[] }>;
}

interface ParsedRow {
  index: number;
  data: Partial<Employee>;
  isValid: boolean;
  errors: string[];
}

const CSV_TEMPLATE = `employeeId,name,email,phone,department,designation,salary,currency,bankName,accountNumber,ifscCode
EMP-201,Kunal Ghosh,kunal.g@paygate.corp,+91 98765 11223,Engineering,Senior Backend Engineer,95000,INR,HDFC Bank,•••• 5821,HDFC0001234
EMP-202,Tanvi Deshmukh,tanvi.d@paygate.corp,+91 98765 22334,Marketing,Brand Strategist,75000,INR,ICICI Bank,•••• 8832,ICIC0000987
EMP-203,Arjun Nair,arjun.n@paygate.corp,+91 98765 33445,Product,Technical Product Manager,110000,INR,Axis Bank,•••• 1920,UTIB0000542
EMP-204,Deepika Rao,deepika.r@paygate.corp,+91 98765 44556,Design,Senior UI Designer,80000,INR,Kotak Bank,•••• 4419,KKBK0000112
`;

export default function CsvImportModal({ isOpen, onClose, onImportSuccess, onBulkImport }: Props) {
  const [csvText, setCsvText] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'paygate_employees_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvText(content);
      parseCsv(content);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      setParsedRows([]);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: ParsedRow[] = [];
    const seenIds = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      if (cols.length === 0 || (cols.length === 1 && cols[0] === '')) continue;

      const rowData: Record<string, any> = {};
      headers.forEach((h, idx) => {
        rowData[h] = cols[idx] || '';
      });

      const errors: string[] = [];
      const empId = rowData.employeeid || rowData['employee id'] || rowData.id;
      const name = rowData.name || rowData['full name'];
      const email = rowData.email || rowData['work email'];
      const department = rowData.department || 'Engineering';
      const designation = rowData.designation || rowData.role || 'Team Member';
      const rawSalary = rowData.salary || rowData.amount;
      const currency = (rowData.currency || 'INR').toUpperCase();
      const bankName = rowData.bankname || rowData['bank name'] || 'HDFC Bank';
      const accountNumber = rowData.accountnumber || rowData['account number'] || '•••• 0000';
      const ifscCode = rowData.ifsccode || rowData['ifsc code'] || 'HDFC0001234';

      if (!name) errors.push('Name is missing');
      if (!email || !email.includes('@')) errors.push('Valid email is required');
      if (!rawSalary || isNaN(Number(rawSalary)) || Number(rawSalary) <= 0) {
        errors.push('Positive salary amount is required');
      }
      if (empId && seenIds.has(empId)) {
        errors.push(`Duplicate Employee ID ${empId} in CSV`);
      } else if (empId) {
        seenIds.add(empId);
      }

      const salaryNumber = Number(rawSalary) || 0;
      // Convert standard currency unit to smallest unit (paise/cents)
      const salaryInPaise = Math.round(salaryNumber * 100);

      rows.push({
        index: i,
        data: {
          employeeId: empId,
          name,
          email,
          phone: rowData.phone || undefined,
          department,
          designation,
          salary: salaryInPaise,
          currency,
          bankName,
          accountNumber,
          ifscCode,
          status: 'ACTIVE',
        },
        isValid: errors.length === 0,
        errors,
      });
    }

    setParsedRows(rows);
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  const handleImport = async () => {
    const validRecords = parsedRows.filter((r) => r.isValid).map((r) => r.data);
    if (validRecords.length === 0) {
      toast.error('No valid records to import');
      return;
    }

    setImporting(true);
    try {
      const result = await onBulkImport(validRecords);
      toast.success(`Successfully imported ${result.imported} employees (${result.created} created, ${result.updated} updated)`);
      onImportSuccess(result.imported);
      onClose();
    } catch (err: any) {
      toast.error(`Import error: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <UploadCloud size={20} color="var(--green)" />
            Import Employees from CSV / Spreadsheet
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Upload your employee roster. The system automatically validates every row before saving.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={downloadTemplate}
              type="button"
            >
              <Download size={13} />
              Download Template (.CSV)
            </button>
          </div>

          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            textAlign: 'center',
            background: '#f8fafc',
            marginBottom: 20,
          }}>
            <input
              type="file"
              accept=".csv"
              id="csv-upload"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <label htmlFor="csv-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--green-bg)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UploadCloud size={24} />
              </div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Click to select a CSV file</div>
              <div className="text-xs text-muted">Supports .csv format with headers: employeeId, name, email, department, designation, salary</div>
            </label>
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label className="field-label">Or Paste CSV Text Directly</label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value);
                parseCsv(e.target.value);
              }}
              placeholder={`employeeId,name,email,department,designation,salary\nEMP-150,Anya Gupta,anya@paygate.corp,Engineering,Lead Architect,120000`}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
            />
          </div>

          {parsedRows.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                  Validation Summary: {parsedRows.length} Rows Detected
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span className="badge badge-success">
                    <CheckCircle2 size={12} /> {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="badge badge-danger">
                      <AlertTriangle size={12} /> {invalidCount} Invalid
                    </span>
                  )}
                </div>
              </div>

              <div className="table-shell" style={{ maxHeight: 220, overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Status</th>
                      <th>Emp ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Salary</th>
                      <th>Validation Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((r) => (
                      <tr key={r.index} style={{ background: r.isValid ? '#ffffff' : 'var(--rose-bg)' }}>
                        <td className="td-mono">{r.index}</td>
                        <td>
                          {r.isValid ? (
                            <span className="badge badge-success"><CheckCircle2 size={11} /> Ready</span>
                          ) : (
                            <span className="badge badge-danger"><AlertTriangle size={11} /> Error</span>
                          )}
                        </td>
                        <td className="td-mono">{r.data.employeeId || 'Auto'}</td>
                        <td style={{ fontWeight: 600 }}>{r.data.name || '—'}</td>
                        <td>{r.data.department || '—'}</td>
                        <td className="td-mono">{r.data.currency} {((r.data.salary || 0) / 100).toFixed(0)}</td>
                        <td className="text-xs" style={{ color: r.isValid ? 'var(--green-dark)' : 'var(--rose)' }}>
                          {r.isValid ? 'Valid row' : r.errors.join(', ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={importing}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleImport}
            disabled={importing || validCount === 0}
          >
            {importing ? <span className="spinner" /> : null}
            Import {validCount} Valid Employees <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
