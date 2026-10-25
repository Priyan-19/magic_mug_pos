import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  TrendingDown,
  Calendar,
  X,
  RotateCcw,
} from 'lucide-react';
import { Expense } from '../types';
import { expenseService, getStoredExpenses } from '../services/cafeServices';
import { useToast } from '../context/ToastContext';
import { formatDateOnly } from '../utils/formatDate';

const CACHED_EXPENSE_KEY = 'magic_mug_cached_expense_total';

export const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const stored = getStoredExpenses();
    return stored ? stored.items : [];
  });
  const [totalAmount, setTotalAmount] = useState<string | null>(() => {
    try {
      const stored = getStoredExpenses();
      if (stored) return String(stored.total_amount);
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem(CACHED_EXPENSE_KEY);
      }
      return null;
    } catch {
      return null;
    }
  });
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(() => !getStoredExpenses());
  const activeRequestIdRef = useRef<number>(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [category, setCategory] = useState('Milk & Dairy');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  const { success: showSuccess, error: showError } = useToast();

  const standardCategories = [
    'Milk & Dairy',
    'Coffee Beans',
    'Bakery Supplies',
    'Utilities',
    'Maintenance',
    'Rent',
    'Packaging',
    'Misc Overhead',
  ];

  const fetchExpenses = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    try {
      if (expenses.length === 0) {
        setIsLoading(true);
      }
      const isUnfiltered = !startDate && !endDate && !categoryFilter;
      const res = await expenseService.listExpenses({
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        category: categoryFilter || undefined,
      });

      // Discard out-of-order stale responses
      if (requestId !== activeRequestIdRef.current) return;

      setExpenses(res.items);
      setTotalAmount(res.total_amount);

      if (isUnfiltered && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(CACHED_EXPENSE_KEY, res.total_amount);
        } catch {}
      }
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      showError('Error Loading Expenses', err.message || 'Failed to fetch expenses');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [startDate, endDate, categoryFilter, showError]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    try {
      await expenseService.createExpense({
        category,
        description: description.trim(),
        amount,
        expense_date: expenseDate,
      });
      showSuccess('Expense Logged', `Added ₹${parseFloat(amount).toFixed(2)} for ${category}`);
      setIsModalOpen(false);
      setDescription('');
      setAmount('');
      fetchExpenses();
    } catch (err: any) {
      showError('Save Failed', err.message || 'Failed to log expense');
    }
  };

  const handleDeleteExpense = async (exp: Expense) => {
    if (!window.confirm(`Delete expense "${exp.description}" (₹${parseFloat(exp.amount).toFixed(2)})?`))
      return;

    try {
      await expenseService.deleteExpense(exp.id);
      showSuccess('Expense Removed', 'Ledger record updated');
      fetchExpenses();
    } catch (err: any) {
      showError('Delete Failed', err.message || 'Failed to delete expense');
    }
  };

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-3 sm:space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-maroon-700" />
            <span>Overhead & Expenses</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
            Log cafe overheads to compute accurate net revenue and operating margins
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:py-2.5 rounded-2xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-bold shadow-glow-maroon transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Log Expense</span>
        </button>
      </div>

      {/* KPI Stat Banner */}
      <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
            Total Logged Expenses
          </div>
          {isLoading && totalAmount === null ? (
            <div className="h-7 sm:h-9 w-28 sm:w-36 bg-slate-200/80 rounded-xl animate-pulse mt-1" />
          ) : (
            <div className="text-xl sm:text-3xl font-black font-display text-rose-600 mt-0.5 sm:mt-1 animate-fade-in">
              ₹{parseFloat(totalAmount ?? '0').toFixed(2)}
            </div>
          )}
          <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">
            {isLoading && totalAmount === null ? (
              <span className="inline-block w-28 h-3 bg-slate-100 rounded animate-pulse" />
            ) : (
              `${expenses.length} entries deducted from gross revenue`
            )}
          </div>
        </div>
        <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 flex-shrink-0">
          <TrendingDown className="w-5 h-5 sm:w-8 sm:h-8" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <div className="w-full sm:w-64 min-w-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full h-[44px] px-3 bg-slate-50 border border-slate-200 focus:border-maroon-700 focus:ring-1 focus:ring-maroon-700/20 rounded-xl text-xs font-medium text-slate-800 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">All Expense Categories</option>
              {standardCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 w-full sm:w-auto flex-1 gap-2.5 sm:gap-3">
            {/* Start Date Filter */}
            <div className="relative flex items-center bg-slate-50 border border-slate-200 focus-within:border-maroon-700 focus-within:ring-1 focus-within:ring-maroon-700/20 rounded-xl px-3 py-1.5 h-[44px] min-w-0 transition-all">
              <Calendar className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0 pointer-events-none" />
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-0.5 select-none">
                  From Date
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none p-0 cursor-pointer min-w-0"
                />
              </div>
              {startDate && (
                <button
                  type="button"
                  onClick={() => setStartDate('')}
                  className="p-1 hover:bg-slate-200/70 rounded-full text-slate-400 hover:text-rose-600 transition-colors ml-1 flex-shrink-0"
                  title="Clear from date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* End Date Filter */}
            <div className="relative flex items-center bg-slate-50 border border-slate-200 focus-within:border-maroon-700 focus-within:ring-1 focus-within:ring-maroon-700/20 rounded-xl px-3 py-1.5 h-[44px] min-w-0 transition-all">
              <Calendar className="w-4 h-4 text-slate-400 mr-2 flex-shrink-0 pointer-events-none" />
              <div className="flex flex-col min-w-0 flex-1 justify-center">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none mb-0.5 select-none">
                  To Date
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-800 focus:outline-none p-0 cursor-pointer min-w-0"
                />
              </div>
              {endDate && (
                <button
                  type="button"
                  onClick={() => setEndDate('')}
                  className="p-1 hover:bg-slate-200/70 rounded-full text-slate-400 hover:text-rose-600 transition-colors ml-1 flex-shrink-0"
                  title="Clear to date"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {(categoryFilter || startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="px-2.5 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl font-semibold flex items-center gap-1 transition-colors self-end sm:self-center flex-shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-4 px-5 font-bold">Date</th>
                <th className="py-4 px-5 font-bold">Category</th>
                <th className="py-4 px-5 font-bold">Description</th>
                <th className="py-4 px-5 font-bold">Logged By</th>
                <th className="py-4 px-5 font-bold text-right">Amount</th>
                <th className="py-4 px-5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-mono text-slate-600 font-semibold">{formatDateOnly(exp.expense_date)}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-semibold text-[11px]">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-medium text-slate-900">{exp.description}</td>
                    <td className="py-3.5 px-5 text-slate-500">{exp.creator_name || 'User'}</td>
                    <td className="py-3.5 px-5 text-right font-display font-extrabold text-rose-600 text-sm">
                      ₹{parseFloat(exp.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp)}
                        title="Delete expense"
                        className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">Log Overhead Expense</h3>
            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-900 focus:outline-none"
                >
                  {standardCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="500.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs font-mono text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description / Vendor Note
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. 10L whole milk from dairy supplier"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-maroon-700 rounded-xl text-xs text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-slate-100 text-slate-600 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-2xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-extrabold shadow-glow-maroon"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
