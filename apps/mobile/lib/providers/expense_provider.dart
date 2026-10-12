import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/api_config.dart';
import '../models/expense.dart';

class ExpenseProvider with ChangeNotifier {
  List<Expense> _expenses = [];
  bool _isLoading = false;

  List<Expense> get expenses => _expenses;
  bool get isLoading => _isLoading;

  double get totalExpenseAmount =>
      _expenses.fold(0.0, (sum, exp) => sum + exp.amount);

  Future<void> fetchExpenses({DateTime? startDate, DateTime? endDate, String? category}) async {
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
      if (category != null && category.isNotEmpty) {
        queryParams['category'] = category;
      }

      final res = await ApiClient().dio.get(
        ApiConfig.expensesEndpoint,
        queryParameters: queryParams,
      );

      if (res.statusCode == 200) {
        final raw = res.data;
        final list = (raw is Map && raw['items'] != null)
            ? raw['items']
            : (raw is Map && raw['data'] != null ? raw['data'] : (raw is List ? raw : []));
        if (list is List) {
          _expenses = list
              .map((e) => Expense.fromJson(Map<String, dynamic>.from(e as Map)))
              .toList();
        }
      }
    } catch (e) {
      debugPrint('Error fetching expenses: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> createExpense({
    required String category,
    required double amount,
    required String description,
    required String paymentMode,
    DateTime? expenseDate,
  }) async {
    try {
      final res = await ApiClient().dio.post(
        ApiConfig.expensesEndpoint,
        data: {
          'category': category,
          'amount': amount,
          'description': description,
          'payment_mode': paymentMode,
          'expense_date': (expenseDate ?? DateTime.now()).toIso8601String().substring(0, 10),
        },
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        await fetchExpenses();
        return true;
      }
    } catch (e) {
      debugPrint('Error creating expense: $e');
    }
    return false;
  }
}
