class BillItem {
  final int? id;
  final int productId;
  final String productName;
  final double unitPrice;
  final int quantity;
  final double lineTotal;

  BillItem({
    this.id,
    required this.productId,
    required this.productName,
    required this.unitPrice,
    required this.quantity,
    required this.lineTotal,
  });

  factory BillItem.fromJson(Map<String, dynamic> json) {
    return BillItem(
      id: json['id'],
      productId: json['product_id'] ?? 0,
      productName: json['product_name_snapshot'] ?? json['product_name'] ?? '',
      unitPrice: (json['unit_price_snapshot'] is num)
          ? (json['unit_price_snapshot'] as num).toDouble()
          : double.tryParse('${json['unit_price_snapshot']}') ?? 0.0,
      quantity: json['quantity'] ?? 1,
      lineTotal: (json['line_total'] is num)
          ? (json['line_total'] as num).toDouble()
          : double.tryParse('${json['line_total']}') ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'product_id': productId,
    'quantity': quantity,
  };
}

class Bill {
  final int id;
  final String billNumber;
  final DateTime billDate;
  final double subtotal;
  final double discountAmount;
  final double taxAmount;
  final double totalAmount;
  final String paymentMode;
  final String status;
  final String? voidReason;
  final String? creatorName;
  final List<BillItem> items;

  Bill({
    required this.id,
    required this.billNumber,
    required this.billDate,
    required this.subtotal,
    this.discountAmount = 0.0,
    this.taxAmount = 0.0,
    required this.totalAmount,
    required this.paymentMode,
    required this.status,
    this.voidReason,
    this.creatorName,
    required this.items,
  });

  factory Bill.fromJson(Map<String, dynamic> json) {
    final itemsList = (json['items'] as List<dynamic>?)
            ?.map((i) => BillItem.fromJson(i as Map<String, dynamic>))
            .toList() ??
        [];

    return Bill(
      id: json['id'] ?? 0,
      billNumber: json['bill_number'] ?? '',
      billDate: _parseDateTime(json['bill_date']),
      subtotal: (json['subtotal'] is num)
          ? (json['subtotal'] as num).toDouble()
          : double.tryParse('${json['subtotal']}') ?? 0.0,
      discountAmount: (json['discount_amount'] is num)
          ? (json['discount_amount'] as num).toDouble()
          : double.tryParse('${json['discount_amount']}') ?? 0.0,
      taxAmount: (json['tax_amount'] is num)
          ? (json['tax_amount'] as num).toDouble()
          : double.tryParse('${json['tax_amount']}') ?? 0.0,
      totalAmount: (json['total_amount'] is num)
          ? (json['total_amount'] as num).toDouble()
          : double.tryParse('${json['total_amount']}') ?? 0.0,
      paymentMode: json['payment_mode'] ?? 'CASH',
      status: json['status'] ?? 'CONFIRMED',
      voidReason: json['void_reason'],
      creatorName: json['creator_name'],
      items: itemsList,
    );
  }

  static DateTime _parseDateTime(dynamic value) {
    if (value == null) return DateTime.now();
    if (value is DateTime) return value.toLocal();
    String s = value.toString().trim();
    if (s.isEmpty) return DateTime.now();

    // If string has date only YYYY-MM-DD
    if (RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(s)) {
      final parts = s.split('-').map((p) => int.tryParse(p) ?? 0).toList();
      return DateTime(parts[0], parts[1], parts[2]);
    }

    // If backend sent ISO/SQLite string without timezone offset, treat as UTC
    if (!s.endsWith('Z') && !s.contains('+') && !s.substring(s.length > 10 ? 10 : 0).contains('-')) {
      s = '${s.replaceAll(' ', 'T')}Z';
    }

    final parsed = DateTime.tryParse(s);
    return parsed != null ? parsed.toLocal() : DateTime.now();
  }
}
