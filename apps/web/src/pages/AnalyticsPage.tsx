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
} from 'lucide-react';
import {
  DailyAnalytics,
  WeeklyAnalytics,
  MonthlyAnalytics,
  BestSellerItem,
  Product,
} from '../types';
import { analyticsService, catalogService } from '../services/cafeServices';
import { useToast } from '../context/ToastContext';
import { getProductImage } from '../utils/productImages';

export const AnalyticsPage: React.FC = () => {
  const [timeView, setTimeView] = useState<'today' | 'weekly' | 'monthly'>('today');
  const [dailyData, setDailyData] = useState<DailyAnalytics | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyAnalytics | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics | null>(null);
  const [bestSellers, setBestSellers] = useState<BestSellerItem[]>([]);
  const [trackedProducts, setTrackedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const activeRequestIdRef = useRef<number>(0);

  const { error: showError } = useToast();

  const todayIso = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }, []);

  const loadAnalytics = useCallback(async () => {
    const requestId = ++activeRequestIdRef.current;
    try {
      setIsLoading(true);
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

  const maxChartVal = Math.max(
    ...chartItems.map((item: any) => parseFloat(item.total_sales) || 0),
    50
  );

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
          <div className="mb-2">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              {timeView === 'today'
                ? 'Hourly Sales'
                : timeView === 'weekly'
                ? 'Daily Sales (Last 7 Days)'
                : 'Daily Sales Trend'}
            </h2>
            <p className="text-[11px] text-slate-400">Revenue activity over time</p>
          </div>

          {/* Clean Compact Bar Chart */}
          <div className="h-32 flex items-end gap-1.5 sm:gap-2 pt-2 px-1 overflow-x-auto">
            {chartItems.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No sales data to display
              </div>
            ) : (
              chartItems.map((pt: any, idx: number) => {
                const sales = parseFloat(pt.total_sales) || 0;
                const heightPct = Math.round((sales / maxChartVal) * 100);
                const label = pt.hour_label || pt.day_name || `D${idx + 1}`;
                const isToday = pt.date === todayIso;

                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center gap-1.5 group min-w-[20px]"
                  >
                    {/* Tooltip on hover */}
                    <div className="text-[10px] font-bold text-maroon-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap leading-none">
                      {sales > 0 ? `₹${sales.toFixed(0)}` : ''}
                    </div>

                    <div className="w-full bg-slate-100 rounded-md sm:rounded-lg overflow-hidden flex items-end h-20">
                      <div
                        style={{ height: `${Math.max(8, heightPct)}%` }}
                        className={`w-full rounded-md sm:rounded-lg transition-all duration-300 ${
                          sales > 0
                            ? 'bg-maroon-700 hover:bg-maroon-800 shadow-xs'
                            : 'bg-slate-200/60'
                        }`}
                      />
                    </div>

                    <span
                      className={`text-[9px] sm:text-[10px] font-medium truncate ${
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

