import React, { useState } from 'react';
import { Payment } from '../types';
import { api } from '../services/api';
import { RefreshCw, ArrowUpRight, CheckCircle2, Clock, XCircle, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface PaymentHistoryProps {
  payments: Payment[];
  loading: boolean;
  onRefresh: () => void;
  onSelectPayment?: (payment: Payment) => void;
}

export const PaymentHistory: React.FC<PaymentHistoryProps> = ({
  payments,
  loading,
  onRefresh,
  onSelectPayment,
}) => {
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const handleRefund = async (paymentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (refundingId) return;

    setRefundingId(paymentId);
    const toastId = toast.loading(`Refunding payment ${paymentId}...`);

    try {
      const res = await api.refundPayment(paymentId, {
        reason: 'Requested by user via UI demo dashboard',
      });

      if (res.status === 200 || res.status === 201) {
        toast.success(`Payment refunded successfully!`, { id: toastId });
        onRefresh();
      } else {
        toast.error(`Refund failed: ${res.error?.message || 'Unknown error'}`, { id: toastId });
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`, { id: toastId });
    } finally {
      setRefundingId(null);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="badge badge-success flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>SUCCESS</span>
          </span>
        );
      case 'REFUNDED':
        return (
          <span className="badge badge-info flex items-center gap-1">
            <RotateCcw className="h-3 w-3" />
            <span>REFUNDED</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="badge badge-danger flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            <span>FAILED</span>
          </span>
        );
      case 'PROCESSING':
      case 'PENDING':
        return (
          <span className="badge badge-warning flex items-center gap-1">
            <Clock className="h-3 w-3 animate-spin" />
            <span>{status}</span>
          </span>
        );
      default:
        return <span className="badge badge-info">{status}</span>;
    }
  };

  return (
    <div className="card-glass overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Payment Ledger</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ledger of recorded payments in PostgreSQL database ({payments.length} records)
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="btn btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          title="Refresh payment table"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="table-custom">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Created At</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-500 text-sm">
                  {loading ? 'Loading ledger...' : 'No payments found. Submit a charge or run the concurrency test.'}
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onSelectPayment && onSelectPayment(p)}
                  className="cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <td className="font-mono text-xs text-indigo-300">
                    <span className="truncate max-w-[120px] inline-block">{p.id}</span>
                  </td>
                  <td className="font-mono text-xs text-slate-300">{p.customerId}</td>
                  <td className="font-semibold text-slate-100">
                    {formatCurrency(p.amount, p.currency)}
                  </td>
                  <td>{getStatusBadge(p.status)}</td>
                  <td className="text-xs text-slate-400 font-mono">
                    {new Date(p.createdAt).toLocaleTimeString()}
                  </td>
                  <td className="text-right">
                    {p.status === 'SUCCESS' ? (
                      <button
                        onClick={(e) => handleRefund(p.id, e)}
                        disabled={refundingId === p.id}
                        className="btn btn-secondary text-xs py-1 px-2.5 hover:border-amber-500/50 hover:text-amber-300"
                      >
                        {refundingId === p.id ? 'Refunding...' : 'Refund'}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-600 font-mono">—</span>
                    )}
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
