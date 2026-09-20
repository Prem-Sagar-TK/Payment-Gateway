import React from 'react';
import { IdempotencyRecord } from '../types';
import { KeyRound, Shield, Clock, Hash, CheckCircle2, AlertCircle } from 'lucide-react';

interface IdempotencyDetailsProps {
  records: IdempotencyRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export const IdempotencyDetails: React.FC<IdempotencyDetailsProps> = ({
  records,
  loading,
  onRefresh,
}) => {
  return (
    <div className="card-glass overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-400" />
            <span>Idempotency Records (Database Keys)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Underlying records from the <code className="text-indigo-300 font-mono">idempotency_records</code> table with SHA-256 request hashes
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="table-custom">
          <thead>
            <tr>
              <th>Key</th>
              <th>Customer ID</th>
              <th>Status</th>
              <th>SHA-256 Hash</th>
              <th>Response Code</th>
              <th>Expires At</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                  {loading ? 'Loading idempotency records...' : 'No idempotency keys recorded yet.'}
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono text-xs font-semibold text-indigo-300">
                    <span className="truncate max-w-[150px] inline-block" title={r.key}>
                      {r.key}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-300">{r.customerId}</td>
                  <td>
                    <span
                      className={`badge ${
                        r.status === 'RESOLVED'
                          ? 'badge-success'
                          : r.status === 'PROCESSING'
                          ? 'badge-warning'
                          : 'badge-danger'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-400">
                    <span className="truncate max-w-[140px] inline-block" title={r.requestHash}>
                      {r.requestHash.substring(0, 16)}...
                    </span>
                  </td>
                  <td className="font-mono text-xs text-slate-300">
                    {r.responseCode ? (
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                        {r.responseCode}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="text-xs text-slate-400 font-mono">
                    {new Date(r.expiresAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
