import React from 'react';
import { Sliders, CheckCircle2, XCircle, Clock, Shuffle } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface ProviderModeSelectorProps {
  currentMode: 'success' | 'failure' | 'timeout' | 'random';
  latencyMs: number;
  onModeChange: (mode: 'success' | 'failure' | 'timeout' | 'random', latencyMs: number) => void;
}

export const ProviderModeSelector: React.FC<ProviderModeSelectorProps> = ({
  currentMode,
  latencyMs,
  onModeChange,
}) => {
  const handleModeChange = async (mode: 'success' | 'failure' | 'timeout' | 'random') => {
    try {
      await api.setProviderConfig(mode, latencyMs);
      onModeChange(mode, latencyMs);
      toast.success(`Mock Provider set to '${mode.toUpperCase()}'`);
    } catch (err: any) {
      toast.error(`Failed to update provider mode: ${err.message}`);
    }
  };

  const handleLatencyChange = async (newLatency: number) => {
    try {
      await api.setProviderConfig(currentMode, newLatency);
      onModeChange(currentMode, newLatency);
    } catch (err: any) {
      toast.error(`Failed to update latency: ${err.message}`);
    }
  };

  return (
    <div className="card-glass p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-400" />
            <span>Mock Bank / Card Network Provider</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulate downstream gateway failures, timeouts, and network latency
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900/60 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => handleModeChange('success')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                currentMode === 'success'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Success</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('failure')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                currentMode === 'failure'
                  ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Fail</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('timeout')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                currentMode === 'timeout'
                  ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Timeout</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('random')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                currentMode === 'random'
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shuffle className="h-3.5 w-3.5" />
              <span>Random</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Delay:</span>
            <select
              value={latencyMs}
              onChange={(e) => handleLatencyChange(Number(e.target.value))}
              className="bg-slate-900/80 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1.5"
            >
              <option value={0}>0ms (Instant)</option>
              <option value={50}>50ms</option>
              <option value={150}>150ms</option>
              <option value={500}>500ms</option>
              <option value={1000}>1000ms</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
