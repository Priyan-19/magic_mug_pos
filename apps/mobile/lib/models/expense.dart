class Expense {
  final int id;
  final String category;
  final double amount;
  final String description;
  final String paymentMode;
  final DateTime expenseDate;
  final String? loggedByName;

  Expense({
    required this.id,
    required this.category,
    required this.amount,
    required this.description,
    required this.paymentMode,
    required this.expenseDate,
    this.loggedByName,
  });

  factory Expense.fromJson(Map<String, dynamic> json) {
    return Expense(
      id: json['id'] ?? 0,
      category: json['category'] ?? 'OTHER',
      amount: (json['amount'] is num)
          ? (json['amount'] as num).toDouble()
          : double.tryParse('${json['amount']}') ?? 0.0,
      description: json['description'] ?? '',
      paymentMode: json['payment_mode'] ?? 'CASH',
      expenseDate: _parseDateTime(json['expense_date']),
      loggedByName: json['logged_by_name'],
    );
  }

  static DateTime _parseDateTime(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is DateTime) return value.toLocal();
    String s = value.toString().trim();
    if (s.isEmpty) return DateTime.now();

    if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(s)) {
      final parts = s.split('-').map((p) => int.tryParse(p) ?? 0).toList();
      return DateTime(parts[0], parts[1], parts[2]);
    }

    if (!s.endsWith('Z') && !s.contains('+') && !s.substring(s.length > 10 ? 10 : 0).contains('-')) {
      s = '${s.replaceAll(' ', 'T')}Z';
    }

    final parsed = DateTime.tryParse(s);
    return parsed != null ? parsed.toLocal() : DateTime.now();
  }

  Map<String, dynamic> toJson() => {
    'category': category,
    'amount': amount,
    'description': description,
    'payment_mode': paymentMode,
    'expense_date': expenseDate.toIso8601String().substring(0, 10),
  };
}

class AnalyticsDashboard {
  final double totalRevenue;
  final int totalOrders;
  final double avgOrderValue;
  final double totalExpenses;
  final double netMargin;
  final List<TopProductStat> topProducts;
  final List<SalesTrendPoint> salesTrends;

  AnalyticsDashboard({
    required this.totalRevenue,
    required this.totalOrders,
    required this.avgOrderValue,
    required this.totalExpenses,
    required this.netMargin,
    required this.topProducts,
    required this.salesTrends,
  });

  factory AnalyticsDashboard.fromJson(Map<String, dynamic> json) {
    final topList = (json['top_products'] as List<dynamic>?)
            ?.map((e) => TopProductStat.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList() ??
        [];

    final rawTrends = json['sales_trends'] ?? json['hourly_breakdown'] ?? json['daily_breakdown'];
    final trendsList = (rawTrends as List<dynamic>?)
            ?.map((e) => SalesTrendPoint.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList() ??
        [];

    final revVal = json['total_sales'] ?? json['total_revenue'];
    final ordVal = json['bill_count'] ?? json['total_orders'];
    final avgVal = json['avg_bill_value'] ?? json['avg_order_value'];
    final expVal = json['total_expense'] ?? json['total_expenses'];
    final netVal = json['net_revenue'] ?? json['net_margin'];

    return AnalyticsDashboard(
      totalRevenue: (revVal is num)
          ? revVal.toDouble()
          : double.tryParse('$revVal') ?? 0.0,
      totalOrders: ordVal is int ? ordVal : int.tryParse('$ordVal') ?? 0,
      avgOrderValue: (avgVal is num)
          ? avgVal.toDouble()
          : double.tryParse('$avgVal') ?? 0.0,
      totalExpenses: (expVal is num)
          ? expVal.toDouble()
          : double.tryParse('$expVal') ?? 0.0,
      netMargin: (netVal is num)
          ? netVal.toDouble()
          : double.tryParse('$netVal') ?? 0.0,
      topProducts: topList,
      salesTrends: trendsList,
    );
  }
}

class TopProductStat {
  final int productId;
  final String productName;
  final int totalQty;
  final double totalSales;

  TopProductStat({
    required this.productId,
    required this.productName,
    required this.totalQty,
    required this.totalSales,
  });

  factory TopProductStat.fromJson(Map<String, dynamic> json) {
    final salesVal = json['total_revenue'] ?? json['total_sales'];
    return TopProductStat(
      productId: json['product_id'] ?? 0,
      productName: json['product_name'] ?? '',
      totalQty: json['total_qty'] ?? 0,
      totalSales: (salesVal is num)
          ? salesVal.toDouble()
          : double.tryParse('$salesVal') ?? 0.0,
    );
  }
}

class SalesTrendPoint {
  final String label;
  final double revenue;
  final int orders;

  SalesTrendPoint({
    required this.label,
    required this.revenue,
    required this.orders,
  });

  factory SalesTrendPoint.fromJson(Map<String, dynamic> json) {
    final salesVal = json['total_sales'] ?? json['revenue'];
    return SalesTrendPoint(
      label: json['label'] ?? json['hour_label'] ?? json['day_name'] ?? '${json['date'] ?? ''}',
      revenue: (salesVal is num)
          ? salesVal.toDouble()
          : double.tryParse('$salesVal') ?? 0.0,
      orders: json['bill_count'] ?? json['orders'] ?? 0,
    );
  }
}
