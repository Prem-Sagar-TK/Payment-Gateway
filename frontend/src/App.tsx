import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { PaymentForm } from './components/PaymentForm';
import { RetryPanel } from './components/RetryPanel';
import { ConcurrentTest } from './components/ConcurrentTest';
import { PaymentHistory } from './components/PaymentHistory';
import { IdempotencyDetails } from './components/IdempotencyDetails';
import { ProviderModeSelector } from './components/ProviderModeSelector';
import { api } from './services/api';
import { Payment, IdempotencyRecord, ApiResponse } from './types';
import {
  CreditCard,
  Zap,
  Repeat,
  History,
  KeyRound,
  Trash2,
  ShieldCheck,
  Cpu,
  Layers,
} from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'retry' | 'concurrency'>('single');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [records, setRecords] = useState<IdempotencyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [providerMode, setProviderMode] = useState<'success' | 'failure' | 'timeout' | 'random'>('success');
  const [providerLatency, setProviderLatency] = useState<number>(50);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const [paymentsRes, recordsRes] = await Promise.all([
        api.listPayments(50),
        api.listIdempotencyRecords(50),
      ]);

      if (paymentsRes.status === 200 && paymentsRes.data?.data) {
        setPayments(paymentsRes.data.data);
      }
      if (recordsRes.status === 200 && recordsRes.data?.data) {
        setRecords(recordsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, []);

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to flush all payments and idempotency keys in PostgreSQL?')) {
      return;
    }

    try {
      await api.resetDemo();
      toast.success('Database reset successfully!');
      fetchLedger();
    } catch (err: any) {
      toast.error(`Reset failed: ${err.message}`);
    }
  };

  const handleChargeCreated = (_response: ApiResponse<Payment>) => {
    fetchLedger();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid #1e293b',
          },
        }}
      />

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight text-white">
                  Idempotent Payment Gateway
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  PostgreSQL ACID
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Production-Grade Distributed Idempotency Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 text-rose-300 hover:border-rose-500/40"
              title="Flush test data"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Database</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Mock Provider Controls */}
        <ProviderModeSelector
          currentMode={providerMode}
          latencyMs={providerLatency}
          onModeChange={(mode, latency) => {
            setProviderMode(mode);
            setProviderLatency(latency);
          }}
        />

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('single')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'single'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            <span>Standard Charge</span>
          </button>

          <button
            onClick={() => setActiveTab('retry')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'retry'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Repeat className="h-4 w-4" />
            <span>Interactive Retry Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('concurrency')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'concurrency'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Concurrency Stress Tester (10-100)</span>
          </button>
        </div>

        {/* Active Tab View */}
        <div>
          {activeTab === 'single' && (
            <div className="max-w-2xl mx-auto">
              <PaymentForm onChargeCreated={handleChargeCreated} />
            </div>
          )}

          {activeTab === 'retry' && (
            <div className="max-w-4xl mx-auto">
              <RetryPanel onChargeCreated={handleChargeCreated} />
            </div>
          )}

          {activeTab === 'concurrency' && (
            <div>
              <ConcurrentTest onTestComplete={fetchLedger} />
            </div>
          )}
        </div>

        {/* Real-time Ledger & DB Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
          <PaymentHistory
            payments={payments}
            loading={loading}
            onRefresh={fetchLedger}
          />
          <IdempotencyDetails
            records={records}
            loading={loading}
            onRefresh={fetchLedger}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>Production Idempotent Payment Gateway &bull; Guaranteed Zero Duplicate Charges via PostgreSQL Unique Constraints</p>
      </footer>
    </div>
  );
};
