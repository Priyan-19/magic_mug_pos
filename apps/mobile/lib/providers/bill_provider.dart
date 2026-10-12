import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/api_config.dart';
import '../models/bill.dart';
import 'cart_provider.dart';

class BillProvider with ChangeNotifier {
  List<Bill> _bills = [];
  bool _isLoading = false;
  Bill? _latestCreatedBill;

  List<Bill> get bills => _bills;
  bool get isLoading => _isLoading;
  Bill? get latestCreatedBill => _latestCreatedBill;

  Future<void> fetchBills({DateTime? startDate, DateTime? endDate}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final queryParams = <String, dynamic>{};
      if (startDate != null) {
        queryParams['start_date'] = startDate.toIso8601String().substring(0, 10);
      }
      if (endDate != null) {
        queryParams['end_date'] = endDate.toIso8601String().substring(0, 10);
      }

      final res = await ApiClient().dio.get(
        ApiConfig.billsEndpoint,
        queryParameters: queryParams,
      );

      if (res.statusCode == 200) {
        final raw = res.data;
        final list = (raw is Map && raw['items'] != null)
            ? raw['items']
            : (raw is Map && raw['data'] != null ? raw['data'] : (raw is List ? raw : []));
        if (list is List) {
          _bills = list
              .map((b) => Bill.fromJson(Map<String, dynamic>.from(b as Map)))
              .toList();
        }
      }
    } catch (e) {
      debugPrint('Error fetching bills: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Bill?> createBill(CartProvider cart) async {
    if (cart.isEmpty) return null;

    _isLoading = true;
    notifyListeners();

    try {
      final itemsPayload = cart.itemsList.map((item) => {
        'product_id': item.product.id,
        'quantity': item.quantity,
      }).toList();

      final res = await ApiClient().dio.post(
        ApiConfig.billsEndpoint,
        data: {
          'items': itemsPayload,
          'discount_amount': cart.discountAmount,
          'tax_amount': cart.taxAmount,
          'payment_mode': cart.paymentMode,
        },
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        final raw = res.data;
        final billMap = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
        final bill = Bill.fromJson(Map<String, dynamic>.from(billMap as Map));
        _latestCreatedBill = bill;
        _bills.insert(0, bill);
        cart.clearCart();
        notifyListeners();
        return bill;
      }
    } catch (e) {
      debugPrint('Error creating bill: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return null;
  }

  Future<bool> voidBill(int billId, String reason) async {
    try {
      final res = await ApiClient().dio.post(
        '${ApiConfig.billsEndpoint}/$billId/void',
        data: {'reason': reason},
      );

      if (res.statusCode == 200) {
        final idx = _bills.indexWhere((b) => b.id == billId);
        if (idx != -1) {
          final raw = res.data;
          final billMap = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
          final updated = Bill.fromJson(Map<String, dynamic>.from(billMap as Map));
          _bills[idx] = updated;
          notifyListeners();
        }
        return true;
      }
    } catch (e) {
      debugPrint('Error voiding bill: $e');
    }
    return false;
  }
}
