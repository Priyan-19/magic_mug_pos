import 'package:flutter/material.dart';
import '../core/api_client.dart';
import '../core/api_config.dart';
import '../models/category.dart';
import '../models/product.dart';

class MenuProvider with ChangeNotifier {
  List<Category> _categories = [];
  List<Product> _products = [];
  int? _selectedCategoryId;
  String _searchQuery = '';
  bool _isLoading = false;

  List<Category> get categories => _categories;
  List<Product> get products => _products;
  int? get selectedCategoryId => _selectedCategoryId;
  String get searchQuery => _searchQuery;
  bool get isLoading => _isLoading;

  List<Product> get filteredProducts {
    return _products.where((p) {
      final matchesCategory = _selectedCategoryId == null || p.categoryId == _selectedCategoryId;
      final matchesSearch = _searchQuery.isEmpty ||
          p.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (p.categoryName?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
      return matchesCategory && matchesSearch;
    }).toList();
  }

  Future<void> fetchCatalog() async {
    _isLoading = true;
    notifyListeners();

    try {
      final catRes = await ApiClient().dio.get(ApiConfig.categoriesEndpoint);
      if (catRes.statusCode == 200) {
        final catList = (catRes.data is List)
            ? catRes.data
            : (catRes.data is Map && catRes.data['data'] != null ? catRes.data['data'] : []);
        if (catList is List) {
          _categories = catList
              .map((c) => Category.fromJson(Map<String, dynamic>.from(c as Map)))
              .toList();
        }
      }

      final prodRes = await ApiClient().dio.get(ApiConfig.productsEndpoint);
      if (prodRes.statusCode == 200) {
        final prodList = (prodRes.data is List)
            ? prodRes.data
            : (prodRes.data is Map && prodRes.data['data'] != null ? prodRes.data['data'] : []);
        if (prodList is List) {
          _products = prodList
              .map((p) => Product.fromJson(Map<String, dynamic>.from(p as Map)))
              .toList();
        }
      }
    } catch (e) {
      debugPrint('Error fetching catalog: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectCategory(int? categoryId) {
    _selectedCategoryId = categoryId;
    notifyListeners();
  }

  void setSearchQuery(String query) {
    _searchQuery = query;
    notifyListeners();
  }

  Future<bool> createProduct({
    required String name,
    required double price,
    required int categoryId,
    String? description,
  }) async {
    try {
      final res = await ApiClient().dio.post(
        ApiConfig.productsEndpoint,
        data: {
          'name': name,
          'selling_price': price,
          'category_id': categoryId,
          'description': description,
          'is_active': true,
        },
      );
      if (res.statusCode == 200 || res.statusCode == 201) {
        await fetchCatalog();
        return true;
      }
    } catch (e) {
      debugPrint('Create product failed: $e');
    }
    return false;
  }

  Future<bool> createCategory({
    required String name,
    String? description,
  }) async {
    try {
      final res = await ApiClient().dio.post(
        ApiConfig.categoriesEndpoint,
        data: {
          'name': name.trim(),
          'description': description?.trim(),
          'display_order': _categories.length,
          'is_active': true,
        },
      );
      if (res.statusCode == 200 || res.statusCode == 201) {
        await fetchCatalog();
        return true;
      }
    } catch (e) {
      debugPrint('Create category failed: $e');
    }
    return false;
  }

  Future<bool> toggleProductActive(int productId, bool isActive) async {
    try {
      final res = await ApiClient().dio.put(
        '${ApiConfig.productsEndpoint}/$productId',
        data: {'is_active': isActive},
      );
      if (res.statusCode == 200) {
        final idx = _products.indexWhere((p) => p.id == productId);
        if (idx != -1) {
          _products[idx] = Product(
            id: _products[idx].id,
            name: _products[idx].name,
            description: _products[idx].description,
            price: _products[idx].price,
            categoryId: _products[idx].categoryId,
            categoryName: _products[idx].categoryName,
            imageUrl: _products[idx].imageUrl,
            isActive: isActive,
            isPopular: _products[idx].isPopular,
          );
          notifyListeners();
        }
        return true;
      }
    } catch (e) {
      debugPrint('Toggle product failed: $e');
    }
    return false;
  }
}
