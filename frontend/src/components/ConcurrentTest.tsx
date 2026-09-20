import React, { useState } from 'react';
import { ConcurrencyResult, ConcurrencyStats } from '../types';
import { api } from '../services/api';
import { ConcurrencyViz } from './ConcurrencyViz';
import { Play, RotateCcw, AlertTriangle, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

const genId = () => Math.random().toString(36).substring(2, 10);

interface ConcurrentTestProps {
  onTestComplete?: () => void;
}

export const ConcurrentTest: React.FC<ConcurrentTestProps> = ({ onTestComplete }) => {
  const [concurrencyLevel, setConcurrencyLevel] = useState<number>(10);
  const [sameKey, setSameKey] = useState<boolean>(true);
  const [key, setKey] = useState<string>(() => `test_${genId()}`);
  const [amount, setAmount] = useState<number>(4999);
  const [currency, setCurrency] = useState<string>('INR');
  const [customerId, setCustomerId] = useState<string>('cus_test_123');
  
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<ConcurrencyResult[]>([]);
  const [stats, setStats] = useState<ConcurrencyStats | null>(null);

  const generateNewKey = () => {
    setKey(`test_${genId()}`);
  };

  const runTest = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setResults([]);
    setStats(null);

    const testStartTime = performance.now();
    const currentKey = key;
    const toastId = toast.loading(`Dispatching ${concurrencyLevel} parallel requests...`);

    try {
      const requests = Array.from({ length: concurrencyLevel }, (_, index) => {
        const idempotencyKey = sameKey ? currentKey : `test_${genId()}`;
        const reqStartTime = performance.now();

        return api.createCharge(
          {
            amount,
            currency,
            customer_id: customerId,
            description: `Concurrent test request #${index + 1}`,
          },
          idempotencyKey
        ).then((res) => {
          const reqEndTime = performance.now();
          const latency = Math.round(reqEndTime - reqStartTime);
          const item: ConcurrencyResult = {
            requestId: index + 1,
            status: res.status,
            isReplay: res.isReplay,
            paymentId: res.data?.data?.id,
            error: res.error?.message || (typeof res.error === 'string' ? res.error : undefined),
            latencyMs: latency,
            timestamp: Date.now(),
          };
          setResults((prev) => [...prev, item]);
          return item;
        }).catch((err: any) => {
          const reqEndTime = performance.now();
          const latency = Math.round(reqEndTime - reqStartTime);
          const item: ConcurrencyResult = {
            requestId: index + 1,
            status: err.status || 500,
            isReplay: false,
            error: err.message || 'Network error',
            latencyMs: latency,
            timestamp: Date.now(),
          };
          setResults((prev) => [...prev, item]);
          return item;
        });
      });

      const allResults = await Promise.all(requests);
      const totalDuration = Math.round(performance.now() - testStartTime);

      // Compute statistics
      let created = 0;
      let replayed = 0;
      let conflict = 0;
      let failed = 0;
      const uniquePaymentIds = new Set<string>();

      allResults.forEach((r) => {
        if (r.status === 200 || r.status === 201) {
          if (r.isReplay) {
            replayed++;
          } else {
            created++;
          }
          if (r.paymentId) {
            uniquePaymentIds.add(r.paymentId);
          }
        } else if (r.status === 409) {
          conflict++;
        } else {
          failed++;
        }
      });

      const calculatedStats: ConcurrencyStats = {
        total: concurrencyLevel,
        created,
        replayed,
        conflict,
        failed,
        uniquePaymentIds: uniquePaymentIds.size,
        totalDurationMs: totalDuration,
      };

      setStats(calculatedStats);
      toast.success(`Completed in ${totalDuration}ms!`, { id: toastId });

      if (onTestComplete) {
        onTestComplete();
      }
    } catch (err: any) {
      toast.error(`Test failed: ${err.message}`, { id: toastId });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="card-glass p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-indigo-400" />
              <span>Concurrency Stress Tester</span>
            </h2>
            <p className="text-sm text-slate-400">
              Fire burst HTTP requests concurrently using <code className="text-xs bg-slate-800 px-1 py-0.5 rounded text-indigo-300">Promise.all()</code> to test DB-level race conditions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={runTest}
              disabled={isRunning}
              className="btn btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Play className="h-4 w-4" />
              <span>{isRunning ? 'Firing Requests...' : 'Run Concurrency Test'}</span>
            </button>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Concurrency Level
            </label>
            <select
              value={concurrencyLevel}
              onChange={(e) => setConcurrencyLevel(Number(e.target.value))}
              disabled={isRunning}
              className="input-base"
            >
              <option value={5}>5 Concurrent Requests</option>
              <option value={10}>10 Concurrent Requests</option>
              <option value={25}>25 Concurrent Requests</option>
              <option value={50}>50 Concurrent Requests</option>
              <option value={100}>100 Concurrent Requests (Max)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Key Mode
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSameKey(true)}
                disabled={isRunning}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  sameKey
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                Same Key
              </button>
              <button
                type="button"
                onClick={() => setSameKey(false)}
                disabled={isRunning}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  !sameKey
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                Unique Keys
              </button>
            </div>
          </div>

          <div className="md:col-span-1 lg:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {sameKey ? 'Shared Idempotency-Key' : 'Prefix (Auto-generated)'}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={sameKey ? key : 'Auto-generating unique UUIDs per request'}
                onChange={(e) => setKey(e.target.value)}
                disabled={isRunning || !sameKey}
                className="input-base font-mono text-xs flex-1"
              />
              {sameKey && (
                <button
                  type="button"
                  onClick={generateNewKey}
                  disabled={isRunning}
                  className="btn btn-secondary px-3"
                  title="Generate new key"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Customer ID
            </label>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={isRunning}
              className="input-base font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Visualizer Grid */}
      <ConcurrencyViz
        results={results}
        isRunning={isRunning}
        totalRequests={concurrencyLevel}
      />

      {/* Stats Cards */}
      {stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="stat-card">
              <div className="stat-label">Total Requests</div>
              <div className="stat-value text-white">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Created (201)</div>
              <div className="stat-value text-emerald-400">{stats.created}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Replayed (200)</div>
              <div className="stat-value text-indigo-400">{stats.replayed}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Conflict (409)</div>
              <div className="stat-value text-amber-400">{stats.conflict}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Failed (4xx/5xx)</div>
              <div className="stat-value text-rose-400">{stats.failed}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unique DB Records</div>
              <div className="stat-value text-sky-400">{stats.uniquePaymentIds}</div>
            </div>
          </div>

          {/* Idempotency Integrity Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            sameKey
              ? stats.uniquePaymentIds === 1
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : stats.uniquePaymentIds === stats.total
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}>
            {sameKey ? (
              stats.uniquePaymentIds === 1 ? (
                <>
                  <ShieldCheck className="h-6 w-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-200">
                      Zero Duplicate Payments Guarantee Verified!
                    </h4>
                    <p className="text-xs text-emerald-400/90 mt-0.5">
                      All {stats.total} concurrent identical requests resulted in exactly 1 logical payment record in the PostgreSQL database ({stats.created} created, {stats.replayed} replayed cached responses).
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-6 w-6 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-rose-200">
                      Idempotency Violation Detected!
                    </h4>
                    <p className="text-xs text-rose-400/90 mt-0.5">
                      Expected exactly 1 payment record, but found {stats.uniquePaymentIds}.
                    </p>
                  </div>
                </>
              )
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-indigo-200">
                    High-Throughput Unique Keys Processed
                  </h4>
                  <p className="text-xs text-indigo-300/90 mt-0.5">
                    {stats.uniquePaymentIds} separate unique payment transactions were created concurrently in {stats.totalDurationMs}ms.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
