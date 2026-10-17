import React, { useState, useEffect } from 'react';
import {
  X,
  DollarSign,
  TrendingUp,
  CreditCard,
  Smartphone,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User as UserIcon,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { ShiftCashflowSummary } from '../types';
import { shiftService } from '../services/cafeServices';
import { useToast } from '../context/ToastContext';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftChange?: (shift: ShiftCashflowSummary | null) => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onShiftChange,
}) => {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'close' | 'history'>('cashflow');
  const [currentShift, setCurrentShift] = useState<ShiftCashflowSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [historyShifts, setHistoryShifts] = useState<ShiftCashflowSummary[]>([]);

  // Open Shift Form State
  const [openingCash, setOpeningCash] = useState<string>('1000');
  const [openingNotes, setOpeningNotes] = useState<string>('');

  // Close Shift Form State
  const [closingActual, setClosingActual] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');

  const { success: showSuccess, error: showError } = useToast();

  const loadCurrentShift = async () => {
    try {
      setLoading(true);
      const res = await shiftService.getCurrentShift();
      setCurrentShift(res);
      if (onShiftChange) onShiftChange(res);
      if (res && res.status === 'OPEN') {
        setClosingActual(res.expected_cash);
      }
    } catch (err: any) {
      console.error('Failed to load shift:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await shiftService.getHistory(10);
      setHistoryShifts(res);
    } catch (err: any) {
      console.error('Failed to load shift history:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCurrentShift();
      loadHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(openingCash);
    if (isNaN(val) || val < 0) {
      showError('Invalid Amount', 'Please enter a valid non-negative opening cash amount');
      return;
    }
    try {
      setLoading(true);
      const res = await shiftService.openShift({
        opening_cash: val,
        opening_notes: openingNotes.trim() || undefined,
      });
      setCurrentShift(res);
      if (onShiftChange) onShiftChange(res);
      showSuccess('Register Opened', `Day started with ₹${val.toFixed(2)} float`);
      setActiveTab('cashflow');
    } catch (err: any) {
      showError('Open Failed', err.message || 'Could not open register');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const actual = parseFloat(closingActual);
    if (isNaN(actual) || actual < 0) {
      showError('Invalid Amount', 'Please enter the counted cash amount in drawer');
      return;
    }

    if (!window.confirm(`Are you sure you want to end today's register and close the shift?`)) {
      return;
    }

    try {
      setLoading(true);
      const res = await shiftService.closeShift({
        closing_cash_actual: actual,
        closing_notes: closingNotes.trim() || undefined,
      });
      setCurrentShift(null);
      if (onShiftChange) onShiftChange(null);
      showSuccess(
        'Register Closed',
        `Shift closed. Expected: ₹${res.expected_cash}, Counted: ₹${actual.toFixed(2)}`
      );
      loadHistory();
      setActiveTab('history');
    } catch (err: any) {
      showError('Close Failed', err.message || 'Could not close register');
    } finally {
      setLoading(false);
    }
  };

  const expectedAmount = parseFloat(currentShift?.expected_cash || '0');
  const actualAmount = parseFloat(closingActual || '0');
  const difference = !isNaN(actualAmount) ? actualAmount - expectedAmount : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-200/90 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-maroon-50 border border-maroon-100 flex items-center justify-center text-maroon-700 shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Daily Register & Cashflow
                </h3>
                {currentShift?.status === 'OPEN' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Register Open
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                    Closed / Not Started
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Track opening cash float, live payment breakdowns, and end-of-day reconciliation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation (Only shown when shift is open or history available) */}
        {currentShift?.status === 'OPEN' && (
          <div className="flex items-center border-b border-slate-100 bg-white px-5 pt-2 gap-2">
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'cashflow'
                  ? 'border-maroon-700 text-maroon-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Today's Cashflow</span>
            </button>
            <button
              onClick={() => setActiveTab('close')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'close'
                  ? 'border-maroon-700 text-maroon-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Close Day (EOD)</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-maroon-700 text-maroon-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Past Shifts</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* CASE 1: NO SHIFT OPEN -> SHOW DAY OPENING PROMPT */}
          {!currentShift || currentShift.status !== 'OPEN' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/70">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Day Register Is Not Opened
                    </h4>
                    <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                      Start today's register by entering the starting physical cash float in your drawer
                      (for change and coins). All sales and cash expenses will be tracked automatically.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Opening Cash Float (₹) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-black text-slate-900 focus:outline-none focus:border-maroon-700 focus:bg-white"
                    />
                  </div>

                  {/* Quick Preset Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">
                      Quick Set:
                    </span>
                    {[0, 500, 1000, 1500, 2000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setOpeningCash(preset.toString())}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          openingCash === preset.toString()
                            ? 'bg-maroon-700 text-white shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        ₹{preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Opening Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={openingNotes}
                    onChange={(e) => setOpeningNotes(e.target.value)}
                    placeholder="e.g. Morning 100x10 notes + coins"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-maroon-700 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
                  >
                    Skip For Now
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-extrabold shadow-glow-maroon transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Open Register & Start Day</span>
                  </button>
                </div>
              </form>

              {historyShifts.length > 0 && (
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-2">Previous Shifts Summary</div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {historyShifts.slice(0, 3).map((s) => (
                      <div
                        key={s.shift_id}
                        className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-800">
                            Shift #{s.shift_id} ({new Date(s.opened_at).toLocaleDateString()})
                          </span>
                          <span className="text-[10px] text-slate-400 ml-2">by {s.opened_by_name}</span>
                        </div>
                        <div className="font-mono font-bold text-slate-700">
                          Total Sales: ₹{parseFloat(s.total_sales).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* TAB 1: TODAY'S LIVE CASHFLOW */}
              {activeTab === 'cashflow' && (
                <div className="space-y-4">
                  {/* Hero Expected Cash Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-emerald-400" />
                        Expected Cash in Drawer Right Now
                      </span>
                      <button
                        onClick={loadCurrentShift}
                        title="Refresh Cashflow"
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-emerald-400 tracking-tight">
                      ₹{parseFloat(currentShift.expected_cash).toFixed(2)}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 font-medium">
                      Formula: Opening Float (₹{parseFloat(currentShift.opening_cash).toFixed(2)}) + Cash
                      Sales (+₹{parseFloat(currentShift.cash_sales).toFixed(2)}) - Cash Expenses (-₹
                      {parseFloat(currentShift.cash_expenses).toFixed(2)})
                    </p>
                  </div>

                  {/* Cashflow Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-0.5 flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                        Opening Float
                      </div>
                      <div className="text-base font-mono font-black text-slate-900">
                        ₹{parseFloat(currentShift.opening_cash).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Starting drawer cash</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200/70">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 mb-0.5 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-700" />
                        Cash Collected
                      </div>
                      <div className="text-base font-mono font-black text-emerald-900">
                        ₹{parseFloat(currentShift.cash_sales).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-emerald-700/80 mt-0.5">
                        from cash & split sales
                      </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-200/70">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 mb-0.5 flex items-center gap-1">
                        <Smartphone className="w-3 h-3 text-indigo-700" />
                        UPI Digital Sales
                      </div>
                      <div className="text-base font-mono font-black text-indigo-900">
                        ₹{parseFloat(currentShift.upi_sales).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-indigo-700/80 mt-0.5">Direct to bank account</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-purple-50/60 border border-purple-200/70">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 mb-0.5 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-purple-700" />
                        Card Machine
                      </div>
                      <div className="text-base font-mono font-black text-purple-900">
                        ₹{parseFloat(currentShift.card_sales).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-purple-700/80 mt-0.5">POS terminal settlement</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/70">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-700 mb-0.5 flex items-center gap-1">
                        <ArrowDownRight className="w-3 h-3 text-rose-700" />
                        Cash Expenses Paid
                      </div>
                      <div className="text-base font-mono font-black text-rose-900">
                        -₹{parseFloat(currentShift.cash_expenses).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-rose-700/80 mt-0.5">Paid out of drawer</div>
                    </div>

                    <div className="p-3 rounded-2xl bg-maroon-50/60 border border-maroon-200/70">
                      <div className="text-[10px] font-extrabold uppercase tracking-wider text-maroon-700 mb-0.5 flex items-center gap-1">
                        <Receipt className="w-3 h-3 text-maroon-700" />
                        Total Shift Sales
                      </div>
                      <div className="text-base font-mono font-black text-maroon-900">
                        ₹{parseFloat(currentShift.total_sales).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-maroon-700/80 mt-0.5">
                        {currentShift.confirmed_bills_count} bills ({currentShift.void_bills_count} void)
                      </div>
                    </div>
                  </div>

                  {/* Shift Info Footer */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cashier: <strong className="text-slate-800">{currentShift.opened_by_name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Opened: {new Date(currentShift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('close')}
                      className="px-4 py-2.5 rounded-xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-extrabold shadow-glow-maroon transition-all flex items-center gap-1.5"
                    >
                      <span>Proceed to End Day / Close Register</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CLOSE REGISTER / END DAY RECONCILIATION */}
              {activeTab === 'close' && (
                <form onSubmit={handleCloseShift} className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        System Calculated Cash in Drawer
                      </div>
                      <div className="text-xl font-mono font-black text-slate-900 mt-0.5">
                        ₹{expectedAmount.toFixed(2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClosingActual(expectedAmount.toFixed(2))}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shadow-xs transition-all"
                    >
                      Copy Expected Amount
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Actual Physical Cash Counted in Drawer (₹) <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={closingActual}
                        onChange={(e) => setClosingActual(e.target.value)}
                        placeholder="Count all physical cash and enter total"
                        className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-black text-slate-900 focus:outline-none focus:border-maroon-700 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Discrepancy Live Feedback */}
                  {closingActual !== '' && !isNaN(actualAmount) && (
                    <div
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all ${
                        Math.abs(difference) < 0.01
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : difference < 0
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-blue-50 border-blue-200 text-blue-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {Math.abs(difference) < 0.01 ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>
                          {Math.abs(difference) < 0.01
                            ? 'Balanced: Physical cash matches expected cashflow perfectly!'
                            : difference < 0
                            ? `Cash Shortage: ₹${Math.abs(difference).toFixed(2)} missing from drawer`
                            : `Cash Surplus: ₹${difference.toFixed(2)} excess cash in drawer`}
                        </span>
                      </div>
                      <span className="font-mono text-sm font-black">
                        {difference > 0 ? `+₹${difference.toFixed(2)}` : difference < 0 ? `-₹${Math.abs(difference).toFixed(2)}` : '₹0.00'}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                      Closing Handover Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder="e.g. Cash handed over to owner in safety locker"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-maroon-700 focus:bg-white"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('cashflow')}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
                    >
                      Back to Cashflow
                    </button>
                    <button
                      type="submit"
                      disabled={loading || closingActual === ''}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Confirm & Close Register</span>
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: SHIFT HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-3">
                  <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Recent Closed Shifts & EOD Reconciliations
                  </div>
                  {historyShifts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No closed shift records found.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {historyShifts.map((s) => (
                        <div
                          key={s.shift_id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900">
                              Shift #{s.shift_id} • {new Date(s.opened_at).toLocaleDateString()}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                s.closing_difference && Math.abs(parseFloat(s.closing_difference)) < 0.01
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : parseFloat(s.closing_difference || '0') < 0
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              Diff: ₹{parseFloat(s.closing_difference || '0').toFixed(2)}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 font-mono">
                            <div>Float: ₹{parseFloat(s.opening_cash).toFixed(2)}</div>
                            <div>Cash: ₹{parseFloat(s.cash_sales).toFixed(2)}</div>
                            <div>Expected: ₹{parseFloat(s.expected_cash).toFixed(2)}</div>
                            <div>Actual: ₹{parseFloat(s.closing_cash_actual || '0').toFixed(2)}</div>
                          </div>
                          {s.closing_notes && (
                            <div className="text-[10px] text-slate-500 italic mt-1">
                              Note: {s.closing_notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
