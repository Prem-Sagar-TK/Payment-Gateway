import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  CreditCard, RefreshCw, Zap, History, KeyRound,
  Trash2, ShieldCheck, Settings2
} from 'lucide-react';
import { api } from './services/api';
import type { Payment, IdempotencyRecord } from './types';

// ── Pages ─────────────────────────────────────────────────────────────────────
import SendMoneyPage from './pages/SendMoneyPage';
import RetryPage from './pages/RetryPage';
import StressTestPage from './pages/StressTestPage';
import PaymentHistoryPage from './pages/PaymentHistoryPage';
import KeysPage from './pages/KeysPage';
import SettingsPage from './pages/SettingsPage';

type Page = 'send' | 'retry' | 'stress' | 'history' | 'keys' | 'settings';

interface NavItem {
  id: Page;
  icon: React.ReactNode;
  label: string;
  sublabel: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'send',
    icon: <CreditCard size={17} />,
    label: 'Send Money',
    sublabel: 'Create a payment',
  },
  {
    id: 'retry',
    icon: <RefreshCw size={17} />,
    label: 'Try Again',
    sublabel: 'Resend same payment',
  },
  {
    id: 'stress',
    icon: <Zap size={17} />,
    label: 'Batch Test',
    sublabel: 'Send many at once',
  },
  {
    id: 'history',
    icon: <History size={17} />,
    label: 'Payment History',
    sublabel: 'All past payments',
  },
  {
    id: 'keys',
    icon: <KeyRound size={17} />,
    label: 'Safety Keys',
    sublabel: 'Duplicate protection',
  },
  {
    id: 'settings',
    icon: <Settings2 size={17} />,
    label: 'Settings',
    sublabel: 'Provider & mode',
  },
];

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('send');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [records, setRecords] = useState<IdempotencyRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(true);
  const [providerMode, setProviderMode] = useState<'success' | 'failure' | 'timeout' | 'random'>('success');
  const [providerLatency, setProviderLatency] = useState(50);

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsRes, recordsRes] = await Promise.all([
        api.listPayments(50),
        api.listIdempotencyRecords(50),
      ]);

      if (paymentsRes.success && paymentsRes.data?.data) {
        setPayments(paymentsRes.data.data as Payment[]);
      }
      if (recordsRes.success && recordsRes.data?.data) {
        setRecords(recordsRes.data.data as IdempotencyRecord[]);
      }
      setApiOnline(true);
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger();
    api.health().then(() => setApiOnline(true)).catch(() => setApiOnline(false));
  }, [fetchLedger]);

  const handleReset = async () => {
    if (!window.confirm('This will delete all payments and safety keys. Are you sure?')) return;
    try {
      await api.resetDemo();
      toast.success('All data cleared successfully');
      fetchLedger();
    } catch (err: any) {
      toast.error(`Failed to reset: ${err.message}`);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case 'send':
        return <SendMoneyPage onPaymentCreated={fetchLedger} />;
      case 'retry':
        return <RetryPage onPaymentCreated={fetchLedger} />;
      case 'stress':
        return <StressTestPage onTestComplete={fetchLedger} />;
      case 'history':
        return <PaymentHistoryPage payments={payments} loading={loading} onRefresh={fetchLedger} />;
      case 'keys':
        return <KeysPage records={records} loading={loading} onRefresh={fetchLedger} />;
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
        {/* ── Sidebar ── */}
        <aside className="sidebar">
          {/* Brand */}
          <div className="sidebar-brand">
            <div className="brand-icon">
              <ShieldCheck size={22} />
            </div>
            <div className="brand-text">
              <div className="brand-name">PayGate</div>
              <div className="brand-tagline">Idempotent Gateway</div>
            </div>
          </div>

          {/* Online status */}
          <div className={`status-pill ${apiOnline ? '' : 'offline'}`}>
            <span className="status-dot" />
            {apiOnline ? 'System Online' : 'System Offline'}
          </div>

          {/* Navigation */}
          <div className="nav-section-label">Actions</div>

          {NAV_ITEMS.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-sublabel">{item.sublabel}</span>
              </div>
            </div>
          ))}

          <div className="nav-section-label">Records</div>

          {NAV_ITEMS.slice(3, 5).map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-sublabel">{item.sublabel}</span>
              </div>
            </div>
          ))}

          <div className="nav-section-label">System</div>

          {NAV_ITEMS.slice(5).map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <div className="nav-icon">{item.icon}</div>
              <div className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-sublabel">{item.sublabel}</span>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="sidebar-footer">
            <button className="reset-btn" onClick={handleReset}>
              <Trash2 size={14} />
              Clear All Data
            </button>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="main-content">
          <div className="page">
            {renderPage()}
          </div>
        </main>
      </div>
    </>
  );
};
