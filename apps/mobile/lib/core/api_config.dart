import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  // Production Cloud URL on Render
  static const String defaultBaseUrl = 'https://magic-mug-api.onrender.com/api/v1';
  static const String baseUrlKey = 'magic_mug_api_base_url';

  static String baseUrl = defaultBaseUrl;

  static const String loginEndpoint = '/auth/login';
  static const String meEndpoint = '/auth/me';
  static const String productsEndpoint = '/products';
  static const String categoriesEndpoint = '/categories';
  static const String billsEndpoint = '/bills';
  static const String expensesEndpoint = '/expenses';
  static const String analyticsDailyEndpoint = '/analytics/daily';
  static const String analyticsWeeklyEndpoint = '/analytics/weekly';
  static const String analyticsMonthlyEndpoint = '/analytics/monthly';
  static const String analyticsBestSellersEndpoint = '/analytics/best-sellers';

  static Future<void> loadBaseUrl() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(baseUrlKey);
      if (saved != null && saved.trim().isNotEmpty) {
        baseUrl = saved.trim();
      }
    } catch (_) {}
  }

  static Future<void> saveBaseUrl(String url) async {
    try {
      baseUrl = url.trim();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(baseUrlKey, baseUrl);
    } catch (_) {}
  }
}
