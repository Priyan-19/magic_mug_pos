import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Receipt,
  DollarSign,
  CreditCard,
  Banknote,
  QrCode,
  Award,
  Wallet,
} from 'lucide-react';
import {
  DailyAnalytics,
  WeeklyAnalytics,
  MonthlyAnalytics,
  BestSellerItem,
} from '../types';
import { analyticsService } from '../services/cafeServices';
import { useToast } from '../context/ToastContext';

export const AnalyticsPage: React.FC = () => {
  const [timeView, setTimeView] = useState<'today' | 'weekly' | 'monthly'>('today');
  const [dailyData, setDailyData] = useState<DailyAnalytics | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyAnalytics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics | null>(null);
  const [bestSellers, setBestSellers] = useState<BestSellerItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const { error: showError } = useToast();

  const loadAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      if (timeView === 'today') {
        const [daily, best] = await Promise.all([
          analyticsService.getDaily(),
          analyticsService.getBestSellers({ limit: 6 }),
        ]);
        setDailyData(daily);
        setBestSellers(best);
      } else if (timeView === 'weekly') {
        const [weekly, daily, best] = await Promise.all([
          analyticsService.getWeekly(),
          analyticsService.getDaily(),
          analyticsService.getBestSellers({ limit: 6 }),
        ]);
        setWeeklyData(weekly);
        setDailyData(daily);
        setBestSellers(best);
      } else {
        const [monthly, daily, best] = await Promise.all([
          analyticsService.getMonthly(),
          analyticsService.getDaily(),
          analyticsService.getBestSellers({ limit: 6 }),
        ]);
        setMonthlyData(monthly);
        setDailyData(daily);
        setBestSellers(best);
      }
    } catch (err: any) {
      showError('Analytics Error', err.message || 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [timeView, showError]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const currentMetrics = {
    sales:
      timeView === 'today'
        ? dailyData?.total_sales || '0.00'
        : timeView === 'weekly'
        ? weeklyData?.total_sales || '0.00'
        : monthlyData?.total_sales || '0.00',
    bills:
      timeView === 'today'
        ? dailyData?.bill_count || 0
        : timeView === 'weekly'
        ? weeklyData?.bill_count || 0
        : monthlyData?.bill_count || 0,
    aov:
      timeView === 'today'
        ? dailyData?.avg_bill_value || '0.00'
        : (
            parseFloat(
              timeView === 'weekly'
                ? weeklyData?.total_sales || '0'
                : monthlyData?.total_sales || '0'
            ) /
              Math.max(
                1,
                timeView === 'weekly' ? weeklyData?.bill_count || 1 : monthlyData?.bill_count || 1
              )
          ).toFixed(2),
    expenses:
      timeView === 'today'
        ? dailyData?.total_expense || '0.00'
        : timeView === 'weekly'
        ? weeklyData?.total_expense || '0.00'
        : monthlyData?.total_expense || '0.00',
    netRevenue:
      timeView === 'today'
        ? dailyData?.net_revenue || '0.00'
        : timeView === 'weekly'
        ? weeklyData?.net_revenue || '0.00'
        : monthlyData?.net_revenue || '0.00',
  };

  const totalSalesVal = parseFloat(currentMetrics.sales) || 0;
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
          const now = new Date();
          const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
          // Show all days from 1st of the month up to today
          const upToToday = all.filter((d) => d.date <= todayIso);
          return upToToday.length > 0 ? upToToday : all;
        })();

  const maxChartVal = Math.max(
    ...chartItems.map((item: any) => parseFloat(item.total_sales) || 0),
    50
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Header with Clean Segmented Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">Overview of sales and performance</p>
        </div>

        {/* Simple Time Switcher */}
        <div className="inline-flex bg-slate-200/70 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setTimeView('today')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeView === 'today'
                ? 'bg-white text-maroon-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTimeView('weekly')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeView === 'weekly'
                ? 'bg-white text-maroon-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeView('monthly')}
            className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              timeView === 'monthly'
                ? 'bg-white text-maroon-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* 4 Simple KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sales */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Sales</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-maroon-50 text-maroon-700 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-display">
            ₹{parseFloat(currentMetrics.sales).toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
            {timeView === 'today' ? "Today's revenue" : 'Total revenue'}
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Orders</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-display">
            {currentMetrics.bills}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Completed bills</div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg. Order</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-display">
            ₹{parseFloat(currentMetrics.aov).toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">Per customer check</div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Net Profit</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-forest-50 text-forest-700 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-black mt-2 font-display ${
              parseFloat(currentMetrics.netRevenue) >= 0 ? 'text-forest-700' : 'text-rose-600'
            }`}
          >
            ₹{parseFloat(currentMetrics.netRevenue).toFixed(2)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1">
            Expenses: ₹{parseFloat(currentMetrics.expenses).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Main Grid: Sales Chart + Payment Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900">
              {timeView === 'today'
                ? 'Hourly Sales'
                : timeView === 'weekly'
                ? 'Daily Sales (Last 7 Days)'
                : 'Daily Sales Trend'}
            </h2>
            <p className="text-xs text-slate-400">Revenue activity over time</p>
          </div>

          {/* Clean Modern Bar Chart */}
          <div className="h-48 flex items-end gap-2 pt-4 px-1 overflow-x-auto">
            {chartItems.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No sales data to display
              </div>
            ) : (
              chartItems.map((pt: any, idx: number) => {
                const sales = parseFloat(pt.total_sales) || 0;
                const heightPct = Math.round((sales / maxChartVal) * 100);
                const label = pt.hour_label || pt.day_name || `D${idx + 1}`;
                const now = new Date();
                const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                const isToday = pt.date === todayIso;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-2 group min-w-[24px]"
                  >
                    {/* Tooltip on hover */}
                    <div className="text-[10px] font-bold text-maroon-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {sales > 0 ? `₹${sales.toFixed(0)}` : ''}
                    </div>

                    <div className="w-full bg-slate-100 rounded-lg overflow-hidden flex items-end h-28">
                      <div
                        style={{ height: `${Math.max(6, heightPct)}%` }}
                        className={`w-full rounded-lg transition-all duration-300 ${
                          sales > 0
                            ? 'bg-maroon-700 hover:bg-maroon-800 shadow-sm'
                            : 'bg-slate-200/60'
                        }`}
                      />
                    </div>

                    <span
                      className={`text-[10px] font-medium truncate ${
                        isToday ? 'text-maroon-800 font-bold' : 'text-slate-400'
                      } group-hover:text-slate-700`}
                    >
                      {label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment Methods Breakdown (1 col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Payment Breakdown</h2>
            <p className="text-xs text-slate-400 mb-6">Tender distribution</p>

            <div className="space-y-4">
              {/* Cash */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Banknote className="w-4 h-4 text-forest-700" /> Cash
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{cashVal.toFixed(2)}{' '}
                    <span className="text-slate-400 font-normal">({cashPct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${cashPct}%` }}
                    className="h-full bg-forest-600 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* UPI / QRIS */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <QrCode className="w-4 h-4 text-maroon-700" /> UPI / QR
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{upiVal.toFixed(2)}{' '}
                    <span className="text-slate-400 font-normal">({upiPct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${upiPct}%` }}
                    className="h-full bg-maroon-700 rounded-full transition-all duration-500"
                  />
                </div>
              </div>

              {/* Card / Debit */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <CreditCard className="w-4 h-4 text-sky-600" /> Card
                  </span>
                  <span className="font-semibold text-slate-900">
                    ₹{cardVal.toFixed(2)}{' '}
                    <span className="text-slate-400 font-normal">({cardPct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    style={{ width: `${cardPct}%` }}
                    className="h-full bg-sky-500 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
            <span>Total Collected</span>
            <span className="font-bold text-slate-900">₹{totalSalesVal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-maroon-700" />
          <h2 className="text-sm font-bold text-slate-900">Top Selling Products</h2>
        </div>

        {bestSellers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No product sales recorded yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bestSellers.map((item, idx) => (
              <div
                key={item.product_id}
                className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                      idx === 0
                        ? 'bg-maroon-700 text-white'
                        : idx === 1
                        ? 'bg-slate-300 text-slate-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-xs text-slate-900">{item.product_name}</div>
                    <div className="text-[10px] text-slate-400">{item.total_qty} units sold</div>
                  </div>
                </div>

                <div className="text-right">
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
  );
};
