import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Coins,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { ShiftCashflowSummary } from '../types';
import { shiftService, getStoredShift } from '../services/cafeServices';
import { useToast } from '../context/ToastContext';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialShift?: ShiftCashflowSummary | null;
  onShiftChange?: (shift: ShiftCashflowSummary | null) => void;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  initialShift,
  onShiftChange,
}) => {
  const [activeTab, setActiveTab] = useState<'cashflow' | 'close'>('cashflow');
  const [currentShift, setCurrentShift] = useState<ShiftCashflowSummary | null>(
    () => (initialShift !== undefined ? initialShift : getStoredShift())
  );
  const [loading, setLoading] = useState<boolean>(false);

  // Open Shift Form State
  const [openingCash, setOpeningCash] = useState<string>('1000');
  const [openingNotes, setOpeningNotes] = useState<string>('');

  // Close Shift Form State
  const [closingActual, setClosingActual] = useState<string>('');
  const [closingNotes, setClosingNotes] = useState<string>('');

  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    if (initialShift !== undefined) {
      setCurrentShift(initialShift);
      if (initialShift?.status === 'OPEN') {
        setClosingActual(initialShift.expected_cash);
      }
    }
  }, [initialShift]);

  const loadCurrentShift = async () => {
    try {
      if (!currentShift) {
        setLoading(true);
      }
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

  useEffect(() => {
    if (isOpen) {
      loadCurrentShift();
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
      setActiveTab('cashflow');
      onClose();
    } catch (err: any) {
      showError('Close Failed', err.message || 'Could not close register');
    } finally {
      setLoading(false);
    }
  };

  const expectedAmount = parseFloat(currentShift?.expected_cash || '0');
  const actualAmount = parseFloat(closingActual || '0');
  const difference = !isNaN(actualAmount) ? actualAmount - expectedAmount : 0;

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white border border-slate-200/90 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-forest-50 text-forest-700 border border-forest-200">
                    Register Open
                  </span>
                ) : loading && !currentShift ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 border border-slate-200 animate-pulse">
                    Checking...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                    Closed / Not Started
                  </span>
                )}
              </div>
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
          <div className="flex items-center border-b border-slate-100 bg-white px-5 pt-2 gap-2 flex-shrink-0">
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'cashflow'
                ? 'border-maroon-700 text-maroon-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Today's Cashflow</span>
            </button>
            <button
              onClick={() => setActiveTab('close')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${activeTab === 'close'
                ? 'border-maroon-700 text-maroon-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Close Day (EOD)</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
          {/* CASE 0: LOADING STATE (PREVENTS FLASH OF CLOSED FORM) */}
          {loading && !currentShift ? (
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-9 h-9 border-3 border-maroon-700/20 border-t-maroon-700 rounded-full animate-spin" />
              <div className="text-xs font-bold text-slate-700">Verifying Register Status...</div>
              <div className="text-[11px] text-slate-400">Loading live drawer balance and cashflow</div>
            </div>
          ) : /* CASE 1: NO SHIFT OPEN -> SHOW DAY OPENING PROMPT */
          !currentShift || currentShift.status !== 'OPEN' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-maroon-50 via-white to-slate-50 border border-maroon-100 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-maroon-100 text-maroon-800 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-maroon-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-maroon-900">
                      Day Register Is Not Opened
                    </h4>
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${openingCash === preset.toString()
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
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 rounded-xl bg-maroon-700 hover:bg-maroon-800 text-white text-xs font-extrabold shadow-glow-maroon transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Open Register & Start Day</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* TAB 1: TODAY'S LIVE CASHFLOW */}
              {activeTab === 'cashflow' && (
                <div className="space-y-4">
                  {/* Hero Expected Cash Card (Magic Mug Brand Maroon) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-maroon-800 via-maroon-900 to-maroon-950 text-white shadow-card relative overflow-hidden">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-maroon-200 flex items-center gap-1.5">
                        <Wallet className="w-4 h-4 text-maroon-300" />
                        Expected Cash in Drawer Right Now
                      </span>
                      <button
                        onClick={loadCurrentShift}
                        title="Refresh Cashflow"
                        className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight">
                      ₹{parseFloat(currentShift.expected_cash).toFixed(2)}
                    </div>
                  </div>

                  {/* Cashflow Breakdown Grid (Consistent Palette: White cards + Brand Badges) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {/* 1. Opening Float */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          Opening Float
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-mono font-black text-slate-900">
                        ₹{parseFloat(currentShift.opening_cash).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Starting drawer cash</div>
                    </div>

                    {/* 2. Cash Collected (Brand Forest) */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-forest-700">
                          Cash Collected
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-forest-50 text-forest-700 flex items-center justify-center">
                          <DollarSign className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-mono font-black text-forest-700">
                        ₹{parseFloat(currentShift.cash_sales).toFixed(2)}
                      </div>
                      {parseFloat(currentShift.change_given_total || '0') > 0 ? (
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between border-t border-slate-100 pt-1 font-mono">
                          <span>Recv: ₹{parseFloat(currentShift.cash_received_gross || currentShift.cash_sales).toFixed(0)}</span>
                          <span className="text-rose-600">Change: -₹{parseFloat(currentShift.change_given_total || '0').toFixed(0)}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Cash & split sales
                        </div>
                      )}
                    </div>

                    {/* 3. UPI Digital Sales (Brand Maroon Badge) */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                          UPI Digital Sales
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-maroon-50 text-maroon-700 flex items-center justify-center">
                          <Smartphone className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-mono font-black text-slate-900">
                        ₹{parseFloat(currentShift.upi_sales).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Direct to bank account</div>
                    </div>

                    {/* 4. Card Machine */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700">
                          Card Machine
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                          <CreditCard className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-mono font-black text-slate-900">
                        ₹{parseFloat(currentShift.card_sales).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Terminal settlement</div>
                    </div>

                    {/* 5. Cash Expenses Paid */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">
                          Cash Expenses
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-mono font-black text-rose-600">
                        -₹{parseFloat(currentShift.cash_expenses).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Paid out of drawer</div>
                    </div>

                    {/* 6. Total Sales (Brand Maroon) */}
                    <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-maroon-700">
                          Total Sales
                        </span>
                        <div className="w-6 h-6 rounded-lg bg-maroon-50 text-maroon-700 flex items-center justify-center">
                          <Receipt className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div className="text-base sm:text-lg font-mono font-black text-maroon-800">
                        ₹{parseFloat(currentShift.total_sales).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {currentShift.confirmed_bills_count} bills ({currentShift.void_bills_count} void)
                      </div>
                    </div>
                  </div>

                  {/* Physical Cash Drawer Tally & Movement Breakdown */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
                    <div className="flex items-center justify-between font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-maroon-700" />
                        Physical Cash Drawer Tally
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900">
                        ₹{parseFloat(currentShift.expected_cash).toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-1 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-sans">Opening Float:</span>
                        <span>₹{parseFloat(currentShift.opening_cash).toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between text-forest-700">
                        <span className="font-sans">(+) Cash Received from Customers:</span>
                        <span className="font-bold">+₹{parseFloat(currentShift.cash_received_gross || currentShift.cash_sales).toFixed(2)}</span>
                      </div>

                      {parseFloat(currentShift.change_given_total || '0') > 0 && (
                        <div className="flex items-center justify-between text-rose-600">
                          <span className="font-sans">(-) Change Returned:</span>
                          <span className="font-bold">-₹{parseFloat(currentShift.change_given_total || '0').toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-800 border-t border-slate-200/80 pt-1 font-bold">
                        <span className="font-sans">(=) Net Cash Collected:</span>
                        <span>₹{parseFloat(currentShift.cash_sales).toFixed(2)}</span>
                      </div>

                      {parseFloat(currentShift.cash_expenses) > 0 && (
                        <div className="flex items-center justify-between text-rose-600">
                          <span className="font-sans">(-) Shop Expenses (Paid from Drawer):</span>
                          <span className="font-bold">-₹{parseFloat(currentShift.cash_expenses).toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-maroon-900 font-extrabold border-t border-dashed border-slate-300 pt-1.5 text-xs">
                        <span className="font-sans font-bold">Total Physical Cash in Drawer:</span>
                        <span className="text-sm font-black">₹{parseFloat(currentShift.expected_cash).toFixed(2)}</span>
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
                      className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs font-bold transition-all ${Math.abs(difference) < 0.01
                        ? 'bg-forest-50 border-forest-200 text-forest-800'
                        : difference < 0
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-forest-50 border-forest-200 text-forest-800'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {Math.abs(difference) < 0.01 ? (
                          <CheckCircle2 className="w-4 h-4 text-forest-700 shrink-0" />
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
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
