import 'package:flutter/material.dart';
import '../models/product.dart';

class CartItem {
  final Product product;
  int quantity;

  CartItem({required this.product, this.quantity = 1});

  double get lineTotal => product.price * quantity;
}

class CartProvider with ChangeNotifier {
  final Map<int, CartItem> _items = {};
  double _discountAmount = 0.0;
  final double _taxRate = 0.0; // 0% default or configurable
  String _paymentMode = 'CASH';

  Map<int, CartItem> get items => _items;
  List<CartItem> get itemsList => _items.values.toList();
  int get itemCount => _items.values.fold(0, (sum, item) => sum + item.quantity);
  double get discountAmount => _discountAmount;
  double get taxRate => _taxRate;
  String get paymentMode => _paymentMode;

  double get subtotal =>
      _items.values.fold(0.0, (sum, item) => sum + item.lineTotal);

  double get taxAmount => (subtotal - _discountAmount > 0)
      ? (subtotal - _discountAmount) * (_taxRate / 100)
      : 0.0;

  double get totalAmount {
    final total = subtotal - _discountAmount + taxAmount;
    return total > 0 ? total : 0.0;
  }

  bool get isEmpty => _items.isEmpty;

  void addToCart(Product product) {
    if (_items.containsKey(product.id)) {
      _items[product.id]!.quantity += 1;
    } else {
      _items[product.id] = CartItem(product: product, quantity: 1);
    }
    notifyListeners();
  }

  void decrementQuantity(int productId) {
    if (!_items.containsKey(productId)) return;
    if (_items[productId]!.quantity > 1) {
      _items[productId]!.quantity -= 1;
    } else {
      _items.remove(productId);
    }
    notifyListeners();
  }

  void removeFromCart(int productId) {
    _items.remove(productId);
    notifyListeners();
  }

  void setDiscount(double discount) {
    _discountAmount = discount >= 0 ? discount : 0.0;
    notifyListeners();
  }

  void setPaymentMode(String mode) {
    _paymentMode = mode;
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    _discountAmount = 0.0;
    _paymentMode = 'CASH';
    notifyListeners();
  }
}
