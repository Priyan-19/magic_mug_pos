import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../providers/analytics_provider.dart';
import '../widgets/custom_top_bar.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  String _selectedRange = 'today';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AnalyticsProvider>().fetchDashboard(range: _selectedRange);
    });
  }

  void _onRangeChanged(String range) {
    setState(() => _selectedRange = range);
    context.read<AnalyticsProvider>().fetchDashboard(range: range);
  }

  @override
  Widget build(BuildContext context) {
    final analytics = context.watch<AnalyticsProvider>();
    final dashboard = analytics.dashboard;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const CustomTopBar(title: 'Analytics & Reports'),
      body: RefreshIndicator(
        color: AppColors.maroon,
        onRefresh: () => analytics.fetchDashboard(range: _selectedRange),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Range Filter Tabs
              Container(
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Row(
                  children: [
                    _buildRangeTab('today', 'Today', _selectedRange == 'today'),
                    _buildRangeTab('month', 'This Month', _selectedRange == 'month'),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              if (analytics.isLoading && dashboard == null)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.symmetric(vertical: 40),
                    child: CircularProgressIndicator(color: AppColors.maroon),
                  ),
                )
              else if (dashboard != null) ...[
                // Top KPI Grid
                Row(
                  children: [
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Total Revenue',
                        value: '₹${dashboard.totalRevenue.toStringAsFixed(2)}',
                        subtitle: '${dashboard.totalOrders} Orders',
                        icon: Icons.trending_up,
                        iconColor: AppColors.forestGreen,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Total Expenses',
                        value: '₹${dashboard.totalExpenses.toStringAsFixed(2)}',
                        subtitle: 'Overhead logged',
                        icon: Icons.trending_down,
                        iconColor: AppColors.error,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Net Profit Margin',
                        value: '₹${dashboard.netMargin.toStringAsFixed(2)}',
                        subtitle: 'Revenue - Expenses',
                        icon: Icons.account_balance_wallet_outlined,
                        iconColor: dashboard.netMargin >= 0 ? AppColors.forestGreen : AppColors.error,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Avg Order Value',
                        value: '₹${dashboard.avgOrderValue.toStringAsFixed(2)}',
                        subtitle: 'Per completed bill',
                        icon: Icons.pie_chart_outline,
                        iconColor: AppColors.maroon,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Sales Trend Chart
                if (dashboard.salesTrends.isNotEmpty) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Sales Trend',
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textPrimary),
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          height: 180,
                          child: BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              barTouchData: BarTouchData(
                                enabled: true,
                                touchTooltipData: BarTouchTooltipData(
                                  getTooltipItem: (group, groupIndex, rod, rodIndex) {
                                    final index = group.x.toInt();
                                    if (index >= 0 && index < dashboard.salesTrends.length) {
                                      final item = dashboard.salesTrends[index];
                                      return BarTooltipItem(
                                        '${item.label}\n₹${rod.toY.toStringAsFixed(0)}',
                                        const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                                      );
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              titlesData: FlTitlesData(
                                show: true,
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    reservedSize: 28,
                                    getTitlesWidget: (val, meta) {
                                      final index = val.toInt();
                                      final total = dashboard.salesTrends.length;
                                      if (index < 0 || index >= total) return const SizedBox.shrink();

                                      // Show 5-6 evenly spaced labels so they NEVER collide
                                      final step = total > 16 ? 4 : (total > 8 ? 2 : 1);
                                      if (index % step != 0 && index != total - 1) {
                                        return const SizedBox.shrink();
                                      }

                                      return Padding(
                                        padding: const EdgeInsets.only(top: 6),
                                        child: Text(
                                          dashboard.salesTrends[index].label,
                                          style: const TextStyle(fontSize: 9.5, color: AppColors.textMuted, fontWeight: FontWeight.bold),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              ),
                              gridData: const FlGridData(show: false),
                              borderData: FlBorderData(show: false),
                              barGroups: dashboard.salesTrends.asMap().entries.map((entry) {
                                final total = dashboard.salesTrends.length;
                                final barWidth = total > 20 ? 8.0 : (total > 10 ? 12.0 : 16.0);
                                return BarChartGroupData(
                                  x: entry.key,
                                  barRods: [
                                    BarChartRodData(
                                      toY: entry.value.revenue,
                                      color: AppColors.maroon,
                                      width: barWidth,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],

                // Top Selling Items
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Top Selling Dishes',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: AppColors.textPrimary),
                      ),
                      const SizedBox(height: 12),
                      if (dashboard.topProducts.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 20),
                          child: Center(
                            child: Text('No sales data recorded yet', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: dashboard.topProducts.length,
                          separatorBuilder: (_, __) => const Divider(height: 14, color: AppColors.borderLight),
                          itemBuilder: (ctx, idx) {
                            final item = dashboard.topProducts[idx];
                            return Row(
                              children: [
                                Container(
                                  width: 26,
                                  height: 26,
                                  alignment: Alignment.center,
                                  decoration: BoxDecoration(
                                    color: idx == 0
                                        ? const Color(0xFFFEF3C7)
                                        : idx == 1
                                            ? const Color(0xFFF1F5F9)
                                            : const Color(0xFFFFF7ED),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Text(
                                    '#${idx + 1}',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      color: idx == 0 ? const Color(0xFFD97706) : AppColors.textPrimary,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.productName,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                                      ),
                                      Text(
                                        '${item.totalQty} sold',
                                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '₹${item.totalSales.toStringAsFixed(2)}',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.textPrimary),
                                ),
                              ],
                            );
                          },
                        ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRangeTab(String key, String label, bool isSelected) {
    return Expanded(
      child: GestureDetector(
        onTap: () => _onRangeChanged(key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.maroon : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: isSelected ? Colors.white : AppColors.textSecondary,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildKpiCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
              Icon(icon, size: 16, color: iconColor),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
          ),
          const SizedBox(height: 2),
          Text(
            subtitle,
            style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
