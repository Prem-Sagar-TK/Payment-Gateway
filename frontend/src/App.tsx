import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  LayoutDashboard, Users, FileSpreadsheet, CreditCard, RefreshCw,
  Zap, History, KeyRound, Settings2, Trash2, ShieldCheck, Menu, X
} from 'lucide-react';
import { api } from './services/api';
import type { Payment, IdempotencyRecord, Employee, PayrollBatch } from './types';

import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import PayrollPage from './pages/PayrollPage';
import SendMoneyPage from './pages/SendMoneyPage';
import RetryPage from './pages/RetryPage';
import StressTestPage from './pages/StressTestPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import KeysPage from './pages/KeysPage';
import SettingsPage from './pages/SettingsPage';

export type Page =
  | 'dashboard'
  | 'employees'
  | 'payroll'
  | 'send'
  | 'retry'
  | 'stress'
  | 'history'
  | 'keys'
  | 'settings';

interface NavItem {
  id: Page;
  icon: React.ReactNode;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    icon: <LayoutDashboard size={15} />,
    label: 'Dashboard',
  },
  {
    id: 'employees',
    icon: <Users size={15} />,
    label: 'Employees',
  },
  {
    id: 'payroll',
    icon: <FileSpreadsheet size={15} />,
    label: 'Payroll & Bulk Pay',
  },
  {
    id: 'send',
    icon: <CreditCard size={15} />,
    label: 'Send Money',
  },
  {
    id: 'retry',
    icon: <RefreshCw size={15} />,
    label: 'Try Again',
  },
  {
    id: 'stress',
    icon: <Zap size={15} />,
    label: 'Batch Test',
  },
  {
    id: 'history',
    icon: <History size={15} />,
    label: 'Payment History',
  },
  {
    id: 'keys',
    icon: <KeyRound size={15} />,
    label: 'Safety Keys',
  },
  {
    id: 'settings',
    icon: <Settings2 size={15} />,
    label: 'Settings',
  },
];

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Core Gateway & Company State
  const [payments, setPayments] = useState<Payment[]>([]);
  const [records, setRecords] = useState<IdempotencyRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [batches, setBatches] = useState<PayrollBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);

  // Settings & Navigation Context
  const [providerMode, setProviderMode] = useState<'success' | 'failure' | 'timeout' | 'random'>('success');
  const [providerLatency, setProviderLatency] = useState(50);
  const [payrollInitialSelectedIds, setPayrollInitialSelectedIds] = useState<string[]>([]);
  const [selectedPaymentToRetry, setSelectedPaymentToRetry] = useState<Payment | null>(null);
  const [historyDefaultTab, setHistoryDefaultTab] = useState<'payments' | 'batches'>('payments');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, recordsRes, employeesRes, batchesRes] = await Promise.all([
        api.listPayments(50),
        api.listIdempotencyRecords(50),
        api.listEmployees({ limit: 200 }),
        api.listPayrollBatches(50),
      ]);

      if (paymentsRes.success && paymentsRes.data?.data) {
        setPayments(paymentsRes.data.data as Payment[]);
      }
      if (recordsRes.success && recordsRes.data?.data) {
        setRecords(recordsRes.data.data as IdempotencyRecord[]);
      }
      if (employeesRes.success && employeesRes.data?.data) {
        setEmployees(employeesRes.data.data as Employee[]);
      }
      if (batchesRes.success && batchesRes.data?.data) {
        setBatches(batchesRes.data.data as PayrollBatch[]);
      }
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
    api.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
  }, [fetchAllData]);

  const handleReset = async () => {
    if (!window.confirm('This will delete all payments, safety keys, and payroll batches. Are you sure?')) return;
    try {
      await api.resetDemo();
      toast.success('All demo transactions cleared successfully');
      fetchAllData();
    } catch (err: any) {
      toast.error(`Failed to reset: ${err.message}`);
    }
  };

  const handleNavigate = (page: string, params?: any) => {
    if (page === 'payroll' && params?.selectedEmployeeIds) {
      setPayrollInitialSelectedIds(params.selectedEmployeeIds);
    }
    if (page === 'retry' && params?.payment) {
      setSelectedPaymentToRetry(params.payment);
    }
    if (page === 'history' && params?.tab) {
      setHistoryDefaultTab(params.tab);
    }
    setActivePage(page as Page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            employees={employees}
            payments={payments}
            batches={batches}
            loading={loading}
            onNavigate={handleNavigate}
            onRefresh={fetchAllData}
          />
        );
      case 'employees':
        return (
          <EmployeesPage
            employees={employees}
            loading={loading}
            onRefresh={fetchAllData}
            onInitiatePayroll={(selectedIds) => {
              setPayrollInitialSelectedIds(selectedIds);
              setActivePage('payroll');
            }}
          />
        );
      case 'payroll':
        return (
          <PayrollPage
            employees={employees}
            initialSelectedIds={payrollInitialSelectedIds}
            onPayrollComplete={fetchAllData}
            onNavigateHistory={() => {
              setHistoryDefaultTab('batches');
              setActivePage('history');
            }}
          />
        );
      case 'send':
        return <SendMoneyPage onPaymentCreated={fetchAllData} />;
      case 'retry':
        return (
          <RetryPage
            onPaymentCreated={fetchAllData}
            selectedPaymentToRetry={selectedPaymentToRetry}
          />
        );
      case 'stress':
        return <StressTestPage onTestComplete={fetchAllData} />;
      case 'history':
        return (
          <PaymentHistoryPage
            payments={payments}
            batches={batches}
            loading={loading}
            onRefresh={fetchAllData}
            defaultTab={historyDefaultTab}
            onRetryPayment={(payment) => {
              setSelectedPaymentToRetry(payment);
              setActivePage('retry');
            }}
          />
        );
      case 'keys':
        return <KeysPage records={records} loading={loading} onRefresh={fetchAllData} />;
      case 'settings':
        return (
          <SettingsPage
            providerMode={providerMode}
            providerLatency={providerLatency}
            onModeChange={(mode, latency) => {
              setProviderMode(mode);
              setProviderLatency(latency);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: '#09090b',
            color: '#ffffff',
            border: '1px solid #27272a',
            borderRadius: '10px',
            fontSize: '0.85rem',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          },
          success: {
            iconTheme: {
              primary: '#16a34a',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#e11d48',
              secondary: '#ffffff',
            },
          },
        }}
      />

      <div className="app-shell">
        {/* Top Navigation Bar */}
        <header className="top-nav">
          <div className="top-nav-left">
            <div className="top-nav-brand" onClick={() => handleNavigate('dashboard')}>
              <div className="brand-icon">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="brand-name">PayGate</div>
                <div className="brand-tagline">Idempotent Enterprise Gateway</div>
              </div>
            </div>

            <div className={`status-pill ${apiOnline ? '' : 'offline'}`}>
              <span className="status-dot" />
              {apiOnline ? 'System Online' : 'Offline'}
            </div>
          </div>

          <nav className="top-nav-links">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`top-nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => handleNavigate(item.id)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="top-nav-right">
            <button className="reset-btn" onClick={handleReset} title="Clear all payments and keys">
              <Trash2 size={13} />
              <span>Clear Data</span>
            </button>

            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <div className={`mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`top-nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleNavigate(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <main className="main-content">
          <div className="page">
            {renderPage()}
          </div>
        </main>
      </div>
    </>
  );
};
