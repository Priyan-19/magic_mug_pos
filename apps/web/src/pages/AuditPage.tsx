import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Terminal,
} from 'lucide-react';
import { AuditLog } from '../types';
import { auditService } from '../services/cafeServices';
import { useToast } from '../context/ToastContext';
import { formatDateTime } from '../utils/formatDate';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [inspectLog, setInspectLog] = useState<AuditLog | null>(null);

  const { error: showError } = useToast();

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await auditService.getLogs({
        page,
        limit: 20,
        action: actionFilter || undefined,
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err: any) {
      showError('Audit Logs Error', err.message || 'Failed to fetch audit trails');
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter, showError]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  const getActionBadge = (action: string) => {
    if (action.includes('VOID') || action.includes('DELETE') || action.includes('DEACTIVATED')) {
      return 'bg-rose-50 text-rose-600 border border-rose-200';
    }
    if (action.includes('CREATE') || action.includes('BILL_CREATED')) {
      return 'bg-forest-50 text-forest-700 border border-forest-200';
    }
    if (action.includes('LOGIN')) {
      return 'bg-sky-50 text-sky-600 border border-sky-200';
    }
    return 'bg-amber-50 text-amber-700 border border-amber-200';
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-maroon-700" />
            <span>Immutable System Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational ledger tracking voided bills, price alterations, logins, and cost entries
          </p>
        </div>

        <div className="w-full sm:w-64">
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 shadow-sm focus:outline-none"
          >
            <option value="">All Security Events</option>
            <option value="BILL_VOIDED">BILL_VOIDED</option>
            <option value="BILL_CREATED">BILL_CREATED</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="PRODUCT_UPDATED">PRODUCT_UPDATED</option>
            <option value="PRODUCT_DEACTIVATED">PRODUCT_DEACTIVATED</option>
            <option value="EXPENSE_CREATED">EXPENSE_CREATED</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-4 px-5 font-bold">Timestamp</th>
                <th className="py-4 px-5 font-bold">Actor</th>
                <th className="py-4 px-5 font-bold">Action Code</th>
                <th className="py-4 px-5 font-bold">Target Entity</th>
                <th className="py-4 px-5 font-bold">Metadata Summary</th>
                <th className="py-4 px-5 font-bold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    Loading security logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-sans">
                    Zero audit entries match filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-5 text-slate-600 text-[11px] font-medium">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-5 font-sans font-semibold text-slate-900">
                      {log.username || 'System'}
                    </td>
                    <td className="py-3 px-5">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-600 font-medium">
                      {log.entity_type}:{log.entity_id}
                    </td>
                    <td className="py-3 px-5 text-slate-500 font-sans text-xs truncate max-w-xs">
                      {JSON.stringify(log.metadata)}
                    </td>
                    <td className="py-3 px-5 text-right font-sans">
                      <button
                        onClick={() => setInspectLog(log)}
                        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-medium font-sans">
            Showing {logs.length} of {total} events (Page {page} of {totalPages})
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-900 font-bold px-2">{page}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* JSON Inspector Modal */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-maroon-700" />
                <h3 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                  Log #{inspectLog.id} — {inspectLog.action}
                </h3>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 font-mono text-xs overflow-y-auto">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1 text-[11px] sm:text-xs">
                <div className="text-slate-500">Timestamp: {formatDateTime(inspectLog.created_at)}</div>
                <div className="text-slate-500">Actor: {inspectLog.username || 'System'}</div>
                <div className="text-slate-500">
                  Target: {inspectLog.entity_type} #{inspectLog.entity_id}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 font-sans">
                  Metadata JSON Payload
                </div>
                <pre className="p-3 sm:p-4 rounded-2xl bg-slate-900 text-emerald-400 overflow-x-auto text-[10px] sm:text-[11px] leading-relaxed">
                  {JSON.stringify(inspectLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 text-right flex-shrink-0">
              <button
                onClick={() => setInspectLog(null)}
                className="px-5 py-2 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
