import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  CreditCard,
  Banknote,
  QrCode,
  Award,
  Wallet,
  Package,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  DailyAnalytics,
  WeeklyAnalytics,
  MonthlyAnalytics,
  BestSellerItem,
  Product,
} from '../types';
import { analyticsService, catalogService, getStoredAnalytics } from '../services/cafeServices';
import { useToast } from '../context/ToastContext';
import { getProductImage } from '../utils/productImages';

export const AnalyticsPage: React.FC = () => {
  const [timeView, setTimeView] = useState<'today' | 'weekly' | 'monthly'>('today');
  const [dailyData, setDailyData] = useState<DailyAnalytics | null>(() => getStoredAnalytics());
  const [weeklyData, setWeeklyData] = useState<WeeklyAnalytics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics | null>(null);
  const [bestSellers, setBestSellers] = useState<BestSellerItem[]>([]);
  const [trackedProducts, setTrackedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(() => !getStoredAnalytics());
  const activeRequestIdRef = useRef<number>(0);

  const { error: showError } = useToast();

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const loadAnalytics = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    try {
      if (!dailyData && !weeklyData && !monthlyData) {
        setIsLoading(true);
      }
      const prodsPromise = catalogService.getProducts().catch(() => []);

      if (timeView === 'today') {
        const [daily, best, prods] = await Promise.all([
          analyticsService.getDaily(),
          analyticsService.getBestSellers({ limit: 6 }),
          prodsPromise,
        ]);
        if (requestId !== activeRequestIdRef.current) return;
        setDailyData(daily);
        setBestSellers(best);
        setTrackedProducts(prods.filter((p) => p.track_stock));
      } else if (timeView === 'weekly') {
        const [weekly, daily, best, prods] = await Promise.all([
          analyticsService.getWeekly(),
          analyticsService.getDaily(),
          analyticsService.getBestSellers({ limit: 6 }),
          prodsPromise,
        ]);
        if (requestId !== activeRequestIdRef.current) return;
        setWeeklyData(weekly);
        setDailyData(daily);
        setBestSellers(best);
        setTrackedProducts(prods.filter((p) => p.track_stock));
      } else {
        const [monthly, daily, best, prods] = await Promise.all([
          analyticsService.getMonthly(),
          analyticsService.getDaily(),
          analyticsService.getBestSellers({ limit: 6 }),
          prodsPromise,
        ]);
        if (requestId !== activeRequestIdRef.current) return;
        setMonthlyData(monthly);
        setDailyData(daily);
        setBestSellers(best);
        setTrackedProducts(prods.filter((p) => p.track_stock));
      }
    } catch (err: any) {
      if (requestId !== activeRequestIdRef.current) return;
      showError('Analytics Error', err.message || 'Failed to load analytics');
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [timeView, showError]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const activeData =
    timeView === 'today'
      ? dailyData
      : timeView === 'weekly'
      ? weeklyData
      : monthlyData;

  const currentMetrics = {
    sales: activeData ? activeData.total_sales : null,
    bills: activeData ? activeData.bill_count : null,
    aov:
      timeView === 'today'
        ? dailyData?.avg_bill_value ?? null
        : activeData
        ? (
            parseFloat(activeData.total_sales || '0') /
            Math.max(1, activeData.bill_count || 1)
          ).toFixed(2)
        : null,
    expenses: activeData ? activeData.total_expense : null,
    netRevenue: activeData ? activeData.net_revenue : null,
  };

  const totalSalesVal = parseFloat(currentMetrics.sales || '0') || 0;
  const cashVal = parseFloat(dailyData?.payment_breakdown?.cash || '0');
  const cardVal = parseFloat(dailyData?.payment_breakdown?.card || '0');
  const upiVal = parseFloat(dailyData?.payment_breakdown?.upi || '0');

  const cashPct = totalSalesVal > 0 ? Math.round((cashVal / totalSalesVal) * 100) : 0;
  const cardPct = totalSalesVal > 0 ? Math.round((cardVal / totalSalesVal) * 100) : 0;
  const upiPct = totalSalesVal > 0 ? Math.round((upiVal / totalSalesVal) * 100) : 0;

  // Active chart items
  const chartItems =
    timeView === 'today'
      ? (dailyData?.hourly_breakdown || []).filter((h) => {
          // Always show any hour that has sales + standard operational hours
          return parseFloat(h.total_sales) > 0 || (h.hour >= 8 && h.hour <= 22);
        })
      : timeView === 'weekly'
      ? weeklyData?.daily_breakdown || []
      : (() => {
          const all = monthlyData?.daily_breakdown || [];
          if (all.length === 0) return [];
          const upToToday = all.filter((d) => d.date <= todayIso);
          return upToToday.length > 0 ? upToToday : all;
        })();

  const currentHour = useMemo(() => new Date().getHours(), []);

  const rawMaxVal = Math.max(
    ...chartItems.map((item: any) => parseFloat(item.total_sales) || 0),
    0
  );

  // Round up to clean scale ceiling for pleasing visual ticks
  const maxChartVal = useMemo(() => {
    if (rawMaxVal <= 0) return 100;
    if (rawMaxVal <= 100) return 100;
    if (rawMaxVal <= 500) return Math.ceil(rawMaxVal / 50) * 50;
    if (rawMaxVal <= 2000) return Math.ceil(rawMaxVal / 200) * 200;
    if (rawMaxVal <= 10000) return Math.ceil(rawMaxVal / 1000) * 1000;
    return Math.ceil(rawMaxVal / 5000) * 5000;
  }, [rawMaxVal]);

  const peakItem = useMemo(() => {
    if (!chartItems || chartItems.length === 0) return null;
    let max = 0;
    let peak: any = null;
    for (const item of chartItems) {
      const val = parseFloat(item.total_sales) || 0;
      if (val > max) {
        max = val;
        peak = item;
      }
    }
    return max > 0 ? { item: peak, max } : null;
  }, [chartItems]);

  const formatYTick = (val: number) => {
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
    return `₹${Math.round(val)}`;
  };

  return (
    <div className="p-3 sm:p-5 lg:p-6 w-full max-w-[1440px] mx-auto space-y-3.5">
      {/* Header with Clean Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Overview of sales and performance</p>
        </div>

        {/* Time Switcher */}
        <div className="inline-flex bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setTimeView('today')}
            className={`px-3 sm:px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
              timeView === 'today'
                ? 'bg-white text-maroon-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeView('weekly')}
            className={`px-3 sm:px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
              timeView === 'weekly'
                ? 'bg-white text-maroon-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeView('monthly')}
            className={`px-3 sm:px-3.5 py-1 rounded-lg text-xs font-bold transition-all ${
              timeView === 'monthly'
                ? 'bg-white text-maroon-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* 4 Crisp KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Total Sales */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Sales</span>
            <div className="w-7 h-7 rounded-lg bg-maroon-50 text-maroon-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && currentMetrics.sales === null ? (
            <div className="h-6 sm:h-8 w-24 bg-slate-200/80 rounded-lg animate-pulse mt-1" />
          ) : (
            <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1 font-display animate-fade-in">
              ₹{parseFloat(currentMetrics.sales || '0').toFixed(2)}
            </div>
          )}
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
            {timeView === 'today' ? "Today's revenue" : 'Total revenue'}
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Orders</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && currentMetrics.bills === null ? (
            <div className="h-6 sm:h-8 w-16 bg-slate-200/80 rounded-lg animate-pulse mt-1" />
          ) : (
            <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1 font-display animate-fade-in">
              {currentMetrics.bills ?? 0}
            </div>
          )}
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Completed bills</div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Avg. Order</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && currentMetrics.aov === null ? (
            <div className="h-6 sm:h-8 w-20 bg-slate-200/80 rounded-lg animate-pulse mt-1" />
          ) : (
            <div className="text-lg sm:text-2xl font-black text-slate-900 mt-1 font-display animate-fade-in">
              ₹{parseFloat(currentMetrics.aov || '0').toFixed(2)}
            </div>
          )}
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Per customer check</div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Net Profit</span>
            <div className="w-7 h-7 rounded-lg bg-forest-50 text-forest-700 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          {isLoading && currentMetrics.netRevenue === null ? (
            <div className="h-6 sm:h-8 w-24 bg-slate-200/80 rounded-lg animate-pulse mt-1" />
          ) : (
            <div
              className={`text-lg sm:text-2xl font-black mt-1 font-display animate-fade-in ${
                parseFloat(currentMetrics.netRevenue || '0') >= 0 ? 'text-forest-700' : 'text-rose-600'
              }`}
            >
              ₹{parseFloat(currentMetrics.netRevenue || '0').toFixed(2)}
            </div>
          )}
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
            {isLoading && currentMetrics.expenses === null ? (
              <span className="inline-block w-20 h-2.5 bg-slate-100 rounded animate-pulse" />
            ) : (
              `Expenses: ₹${parseFloat(currentMetrics.expenses || '0').toFixed(2)}`
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Sales Chart + Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Sales Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          {/* Card Header with Stats Pill */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                {timeView === 'today'
                  ? 'Hourly Sales'
                  : timeView === 'weekly'
                  ? 'Daily Sales (Last 7 Days)'
                  : 'Daily Sales Trend'}
              </h2>
              <p className="text-[11px] text-slate-400">Revenue activity over time</p>
            </div>

            {peakItem ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-maroon-50 border border-maroon-200/70 text-maroon-900 text-[11px] font-semibold animate-fade-in">
                <Sparkles className="w-3.5 h-3.5 text-maroon-700" />
                <span>Peak: {peakItem.item.hour_label || peakItem.item.day_name}</span>
                <span className="font-bold text-maroon-800">• ₹{peakItem.max.toFixed(0)}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/70 text-slate-500 text-[11px] font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{timeView === 'today' ? 'Active: 08:00 – 22:00' : 'Activity Tracker'}</span>
              </div>
            )}
          </div>

          {/* Clean Financial SaaS Bar Chart with Gridlines & Slender Pillars */}
          <div className="relative pt-2">
            {chartItems.length === 0 ? (
              <div className="w-full h-44 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
                <Clock className="w-6 h-6 text-slate-300" />
                <span>No sales data to display</span>
              </div>
            ) : (
              <div className="flex gap-2 sm:gap-3">
                {/* Y-Axis Value Labels */}
                <div className="w-9 sm:w-11 flex-shrink-0 flex flex-col justify-between text-[10px] text-slate-400 font-mono h-36 sm:h-40 pb-7 select-none text-right">
                  <span>{formatYTick(maxChartVal)}</span>
                  <span>{formatYTick(maxChartVal / 2)}</span>
                  <span>₹0</span>
                </div>

                {/* Chart Canvas Area */}
                <div className="relative flex-1 min-w-0">
                  {/* Horizontal Reference Gridlines */}
                  <div className="absolute inset-x-0 top-0 h-36 sm:h-40 flex flex-col justify-between pointer-events-none pb-7">
                    <div className="w-full border-b border-dashed border-slate-200/80" />
                    <div className="w-full border-b border-dashed border-slate-200/50" />
                    <div className="w-full border-b border-slate-200" />
                  </div>

                  {/* Columns Container */}
                  <div className="relative z-10 h-36 sm:h-40 flex items-end gap-1 sm:gap-2 px-1 overflow-x-auto">
                    {chartItems.map((pt: any, idx: number) => {
                      const sales = parseFloat(pt.total_sales) || 0;
                      const billCount = pt.bill_count || 0;
                      const heightPct = Math.min(100, Math.max(0, Math.round((sales / maxChartVal) * 100)));
                      const label = pt.hour_label || pt.day_name || `D${idx + 1}`;
                      const isToday = pt.date === todayIso;
                      const isCurrentHour = timeView === 'today' && pt.hour === currentHour;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-[18px] hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Floating Glassmorphic Tooltip */}
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-30 scale-95 group-hover:scale-100 origin-bottom">
                            <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-md px-2.5 py-1.5 shadow-xl text-center whitespace-nowrap border border-slate-700/60">
                              <div className="text-[10px] font-medium text-slate-300">
                                {timeView === 'today'
                                  ? `${label} – ${String(Number(pt.hour ?? 0) + 1).padStart(2, '0')}:00`
                                  : label}
                              </div>
                              <div className="text-xs font-bold text-amber-400 mt-0.5">
                                ₹{sales.toFixed(2)}
                              </div>
                              {billCount > 0 ? (
                                <div className="text-[10px] text-slate-300 mt-0.5">
                                  {billCount} {billCount === 1 ? 'order' : 'orders'}
                                </div>
                              ) : (
                                <div className="text-[9px] text-slate-400 italic">No sales</div>
                              )}
                            </div>
                            {/* Tooltip arrow */}
                            <div className="w-2 h-2 bg-slate-900 rotate-45 mx-auto -mt-1 border-r border-b border-slate-700/60" />
                          </div>

                          {/* Bar Column & Rounded-Top Single-Color Bar */}
                          <div className="w-full flex-1 flex items-end justify-center pb-2">
                            {sales > 0 ? (
                              <div
                                style={{ height: `${Math.max(4, heightPct)}%` }}
                                className="w-3 sm:w-4 md:w-5 max-w-[22px] rounded-t-md rounded-b-none bg-maroon-700 hover:bg-maroon-800 transition-all duration-300 ease-out shadow-xs"
                              />
                            ) : (
                              <div className="w-3 sm:w-4 md:w-5 max-w-[22px] h-0.5 bg-slate-200/90 rounded-t-xs rounded-b-none group-hover:bg-slate-300 transition-colors" />
                            )}
                          </div>

                          {/* X-Axis Label */}
                          <div className="h-6 flex items-center justify-center mt-0.5">
                            <span
                              className={`text-[9px] sm:text-[10px] transition-colors whitespace-nowrap ${
                                isCurrentHour
                                  ? 'text-maroon-800 font-bold bg-maroon-50 px-1 py-0.5 rounded-none shadow-2xs'
                                  : isToday
                                  ? 'text-maroon-800 font-semibold'
                                  : 'text-slate-400 group-hover:text-slate-700 font-medium'
                              }`}
                            >
                              {label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown (1 col) */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">Payment Breakdown</h2>
            <p className="text-[11px] text-slate-400 mb-3 sm:mb-4">Tender distribution</p>

            <div className="space-y-2.5">
              {/* Cash */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Banknote className="w-3.5 h-3.5 text-forest-700" /> Cash
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{cashVal.toFixed(2)}{' '}
                    <span className="text-slate-400 font-normal text-[11px]">({cashPct}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${cashPct}%` }}
                    className="h-full bg-forest-600 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* UPI / QRIS */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <QrCode className="w-3.5 h-3.5 text-maroon-700" /> UPI / QR
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{upiVal.toFixed(2)}{' '}
                    <span className="text-slate-400 font-normal text-[11px]">({upiPct}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${upiPct}%` }}
                    className="h-full bg-maroon-700 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Card / Debit */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <CreditCard className="w-3.5 h-3.5 text-sky-600" /> Card
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{cardVal.toFixed(2)}{' '}
                    <span className="text-slate-400 font-normal text-[11px]">({cardPct}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${cardPct}%` }}
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Total Collected</span>
            <span className="font-bold text-slate-900">₹{totalSalesVal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Balanced 2-Column Grid for Top Products & Batch Inventory */}
      <div className={`grid grid-cols-1 ${trackedProducts.length > 0 ? 'lg:grid-cols-2' : ''} gap-3.5`}>
        {/* Top Selling Products */}
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-maroon-700" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-900">Top Selling Products</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                Best Sellers
              </span>
            </div>

            {bestSellers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No product sales recorded yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {bestSellers.map((item, idx) => (
                  <div
                    key={item.product_id}
                    className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                          idx === 0
                            ? 'bg-maroon-700 text-white shadow-xs'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-slate-900 truncate">{item.product_name}</div>
                        <div className="text-[10px] text-slate-400">{item.total_qty} units sold</div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-maroon-800 font-display">
                        ₹{parseFloat(item.total_revenue).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tracked Batch Inventory & Availability Balance */}
        {trackedProducts.length > 0 && (
          <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-maroon-700" />
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900">
                      Daily Batch Stock & Availability
                    </h2>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  {trackedProducts.length} Tracked
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {trackedProducts.map((prod) => {
                  const stock = prod.stock_quantity ?? 0;
                  const isSoldOut = stock <= 0;
                  const imgUrl = getProductImage(prod.name, prod.image_url);

                  return (
                    <div
                      key={prod.id}
                      className="p-2 sm:p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={imgUrl}
                          alt={prod.name}
                          className="w-8 h-8 rounded-lg object-cover bg-slate-200 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {prod.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ₹{parseFloat(prod.selling_price).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        {isSoldOut ? (
                          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                            SOLD OUT
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              stock <= 3
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {stock} Balance
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

