import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Receipt,
  Printer,
  Ban,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Banknote,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import { Bill } from '../types';
import { billingService } from '../services/cafeServices';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { PrintableReceipt } from '../components/PrintableReceipt';
import { formatDateTime } from '../utils/formatDate';

export const HistoryPage: React.FC = () => {
  const { isOwner } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [bills, setBills] = useState<Bill[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [summary, setSummary] = useState<{
    total_confirmed_revenue: string;
    confirmed_count: number;
    void_count: number;
  }>({
    total_confirmed_revenue: '0.00',
    confirmed_count: 0,
    void_count: 0,
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [paymentModeFilter, setPaymentModeFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected bill for receipt modal
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Void modal state
  const [billToVoid, setBillToVoid] = useState<Bill | null>(null);
  const [voidReason, setVoidReason] = useState<string>('');
  const [isVoiding, setIsVoiding] = useState<boolean>(false);

  const fetchBills = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await billingService.listBills({
        page,
        limit: 15,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        payment_mode: paymentModeFilter || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setBills(res.items);
      setTotalCount(res.total);
      setTotalPages(res.total_pages);
      setSummary(res.summary);
    } catch (err: any) {
      showError('Error Loading Bills', err.message || 'Failed to fetch bill history');
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, statusFilter, paymentModeFilter, startDate, endDate, showError]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billToVoid || !voidReason.trim()) return;

    try {
      setIsVoiding(true);
      const updated = await billingService.voidBill(billToVoid.id, voidReason.trim());
      showSuccess(`Bill ${updated.bill_number} Voided`, 'Audit log recorded and revenue adjusted');
      setBillToVoid(null);
      setVoidReason('');
      fetchBills();
    } catch (err: any) {
      showError('Void Failed', err.message || 'Could not void bill');
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      {/* Top Banner KPI Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        <div className="p-2.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="min-w-0">
            <div className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              Confirmed Sales
            </div>
            <div className="text-sm sm:text-2xl font-black font-display text-forest-700 mt-0.5 sm:mt-1 truncate">
              ₹{parseFloat(summary.total_confirmed_revenue).toFixed(2)}
            </div>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-forest-50 text-forest-700 flex-shrink-0">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-2.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="min-w-0">
            <div className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              Total Orders
            </div>
            <div className="text-sm sm:text-2xl font-black font-display text-slate-900 mt-0.5 sm:mt-1 truncate">
              {summary.confirmed_count} Orders
            </div>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-maroon-50 text-maroon-700 flex-shrink-0">
            <Receipt className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>

        <div className="p-2.5 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="min-w-0">
            <div className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              Voided Bills
            </div>
            <div className="text-sm sm:text-2xl font-black font-display text-rose-600 mt-0.5 sm:mt-1 truncate">
              {summary.void_count} Voided
            </div>
          </div>
          <div className="hidden sm:flex p-3 rounded-2xl bg-rose-50 text-rose-600 flex-shrink-0">
            <Ban className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2 sm:space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search bill number..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-1 gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed Only</option>
              <option value="VOID">Voided Only</option>
            </select>

            <select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 focus:outline-none sm:hidden"
            >
              <option value="">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Debit / Card</option>
              <option value="UPI">QRIS / UPI</option>
            </select>
          </div>

          <div className="hidden sm:block">
            <select
              value={paymentModeFilter}
              onChange={(e) => {
                setPaymentModeFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 focus:outline-none"
            >
              <option value="">All Payment Modes</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Debit / Card</option>
              <option value="UPI">QRIS / UPI</option>
            </select>
          </div>

          <div className="grid grid-cols-2 sm:contents gap-2">
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bills Ledger Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-4 px-5 font-bold">Bill Number</th>
                <th className="py-4 px-5 font-bold">Date & Time</th>
                <th className="py-4 px-5 font-bold">Mode</th>
                <th className="py-4 px-5 font-bold text-center">Items</th>
                <th className="py-4 px-5 font-bold text-right">Total Amount</th>
                <th className="py-4 px-5 font-bold">Cashier</th>
                <th className="py-4 px-5 font-bold text-center">Status</th>
                <th className="py-4 px-5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading historical orders...
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No bills match your current filters.
                  </td>
                </tr>
              ) : (
                bills.map((bill) => {
                  const isVoid = bill.status === 'VOID';

                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setSelectedBill(bill)}
                    >
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-900 flex items-center gap-2">
                        <Receipt className="w-3.5 h-3.5 text-maroon-700" />
                        <span>{bill.bill_number}</span>
                      </td>
                      <td className="py-3.5 px-5 text-slate-600 font-medium">
                        {formatDateTime(bill.bill_date)}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-mono text-[10px] uppercase font-bold">
                          {bill.payment_mode === 'CASH' && <Banknote className="w-3 h-3 text-forest-700" />}
                          {bill.payment_mode === 'CARD' && <CreditCard className="w-3 h-3 text-sky-600" />}
                          {bill.payment_mode === 'UPI' && <QrCode className="w-3 h-3 text-maroon-700" />}
                          <span>{bill.payment_mode}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center font-mono">{bill.items.length}</td>
                      <td className="py-3.5 px-5 text-right font-extrabold font-display text-slate-900 text-sm">
                        ₹{parseFloat(bill.total_amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">{bill.creator_name || 'Staff'}</td>
                      <td className="py-3.5 px-5 text-center">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isVoid
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-forest-50 text-forest-700 border border-forest-200'
                          }`}
                        >
                          {bill.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => setSelectedBill(bill)}
                            title="View Receipt"
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>

                          {isOwner && !isVoid && (
                            <button
                              onClick={() => {
                                setBillToVoid(bill);
                                setVoidReason('');
                              }}
                              title="Void Bill"
                              className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex items-center justify-between text-xs">
          <div className="text-slate-500 font-medium">
            Showing {bills.length} of {totalCount} total bills (Page {page} of {totalPages})
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

      {/* Bill Receipt Modal */}
      {selectedBill && (
        <PrintableReceipt
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}

      {/* Void Modal */}
      {billToVoid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-rose-200 w-full max-w-md rounded-3xl shadow-2xl p-6">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-2.5 rounded-2xl bg-rose-50">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Void Bill Confirmation</h3>
                <p className="text-xs text-slate-400">{billToVoid.bill_number}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Voiding this bill will mark it as <strong className="text-rose-600">VOID</strong>,
              remove it from sales revenue metrics, and record an audit log entry.
            </p>

            <form onSubmit={handleVoidSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Voiding <span className="text-rose-600">*</span>
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="e.g. Customer returned order, duplicate cashier entry..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-rose-600 rounded-2xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBillToVoid(null)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVoiding || !voidReason.trim()}
                  className="px-4 py-2 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/30 disabled:opacity-50"
                >
                  {isVoiding ? 'Voiding...' : 'Confirm Void'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
