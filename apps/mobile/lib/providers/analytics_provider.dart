import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/api_config.dart';
import '../models/expense.dart'; // contains Analytics models

class AnalyticsProvider with ChangeNotifier {
  AnalyticsDashboard? _dashboard;
  bool _isLoading = false;
  String _selectedRange = 'today'; // 'today', 'month', 'custom'

  AnalyticsDashboard? get dashboard => _dashboard;
  bool get isLoading => _isLoading;
  String get selectedRange => _selectedRange;

  Future<void> fetchDashboard({String range = 'today', DateTime? startDate, DateTime? endDate}) async {
    _isLoading = true;
    _selectedRange = range;
    notifyListeners();

    try {
      final endpoint = range == 'month'
          ? ApiConfig.analyticsMonthlyEndpoint
          : ApiConfig.analyticsDailyEndpoint;

      final res = await ApiClient().dio.get(endpoint);

      if (res.statusCode == 200) {
        final raw = res.data;
        final mapData = (raw is Map && raw['data'] != null) ? raw['data'] : raw;
        if (mapData is Map) {
          _dashboard = AnalyticsDashboard.fromJson(Map<String, dynamic>.from(mapData));
        }
      }
    } catch (e) {
      debugPrint('Error fetching analytics: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
