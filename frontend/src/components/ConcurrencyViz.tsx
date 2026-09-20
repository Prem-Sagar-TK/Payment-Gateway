import React from 'react';
import { ConcurrencyResult } from '../types';

interface ConcurrencyVizProps {
  results: ConcurrencyResult[];
  isRunning: boolean;
  totalRequests: number;
}

export const ConcurrencyViz: React.FC<ConcurrencyVizProps> = ({
  results,
  isRunning,
  totalRequests,
}) => {
  const slots = Array.from({ length: totalRequests }, (_, i) => {
    return results[i] || null;
  });

  const getStatusClass = (res: ConcurrencyResult | null) => {
    if (!res) return 'idle';
    if (res.status === 200 || res.status === 201) {
      return res.isReplay ? 'replay' : 'created';
    }
    if (res.status === 409) return 'conflict';
    if (res.status >= 400 && res.status < 500) return 'error';
    if (res.status >= 500) return 'error';
    return 'idle';
  };

  const getTooltip = (res: ConcurrencyResult | null, idx: number) => {
    if (!res) return `Request #${idx + 1}: Waiting...`;
    return `Req #${res.requestId}\nStatus: ${res.status}\nReplay: ${res.isReplay ? 'YES' : 'NO'}\nLatency: ${res.latencyMs}ms\nTime: ${new Date(res.timestamp).toLocaleTimeString()}`;
  };

  return (
    <div className="card-glass p-6 my-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>Concurrency Visualizer</span>
            {isRunning && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time grid showing atomic resolution of concurrent requests.
          </p>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="dot dot-created inline-block"></span>
            <span className="text-emerald-400">Created (1st)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="dot dot-replay inline-block"></span>
            <span className="text-indigo-400">Replayed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="dot dot-conflict inline-block"></span>
            <span className="text-amber-400">Conflict (409)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="dot dot-error inline-block"></span>
            <span className="text-rose-400">Error (4xx/5xx)</span>
          </div>
        </div>
      </div>

      <div className="dot-grid">
        {slots.map((res, i) => {
          const statusClass = getStatusClass(res);
          return (
            <div
              key={i}
              title={getTooltip(res, i)}
              className={`dot dot-${statusClass} transition-all duration-300 transform hover:scale-125 cursor-pointer`}
            >
              <span className="sr-only">{i + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
