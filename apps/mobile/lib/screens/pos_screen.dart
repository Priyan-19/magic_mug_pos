import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../models/product.dart';
import '../providers/cart_provider.dart';
import '../providers/menu_provider.dart';
import '../providers/bill_provider.dart';
import '../widgets/custom_top_bar.dart';
import '../widgets/receipt_dialog.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MenuProvider>().fetchCatalog();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showCartSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => const _CartBottomSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final menu = context.watch<MenuProvider>();
    final cart = context.watch<CartProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: CustomTopBar(
        title: 'POS Terminal',
        showSearch: true,
        searchController: _searchController,
        onSearchChanged: (val) => menu.setSearchQuery(val),
      ),
      body: menu.isLoading && menu.products.isEmpty
          ? const Center(child: CircularProgressIndicator(color: AppColors.maroon))
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Horizontal Categories Bar
                Container(
                  height: 106,
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    children: [
                      // "All Menu" Pill
                      _buildCategoryCard(
                        id: null,
                        title: 'All Menu',
                        subtitle: '${menu.products.length} Items',
                        icon: Icons.grid_view_rounded,
                        isSelected: menu.selectedCategoryId == null,
                        onTap: () => menu.selectCategory(null),
                      ),
                      const SizedBox(width: 8),

                      // Category items
                      ...menu.categories.map((cat) {
                        final isSelected = menu.selectedCategoryId == cat.id;
                        final count = menu.products.where((p) => p.categoryId == cat.id).length;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: _buildCategoryCard(
                            id: cat.id,
                            title: cat.name,
                            subtitle: '$count Items',
                            icon: _getCategoryIcon(cat.name),
                            isSelected: isSelected,
                            onTap: () => menu.selectCategory(cat.id),
                          ),
                        );
                      }),
                    ],
                  ),
                ),

                // Select Menu Subtitle
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Select Menu',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Text(
                        '${menu.filteredProducts.length} dishes',
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),

                // Dishes 2-Column Grid
                Expanded(
                  child: menu.filteredProducts.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.restaurant_menu, size: 44, color: Colors.grey.shade400),
                              const SizedBox(height: 10),
                              const Text('No products available', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.fromLTRB(14, 8, 14, 80),
                          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            childAspectRatio: 0.78,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                          ),
                          itemCount: menu.filteredProducts.length,
                          itemBuilder: (ctx, idx) {
                            final product = menu.filteredProducts[idx];
                            return _buildProductCard(context, product, cart);
                          },
                        ),
                ),
              ],
            ),

      // Bottom Floating Cart Bar
      bottomSheet: cart.itemCount > 0
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.08),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: AppColors.maroon.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          const Icon(Icons.shopping_bag_outlined, size: 20, color: AppColors.maroon),
                          Positioned(
                            top: 4,
                            right: 4,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: AppColors.maroon,
                                shape: BoxShape.circle,
                              ),
                              child: Text(
                                '${cart.itemCount}',
                                style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text('Total Amount', style: TextStyle(fontSize: 11, color: AppColors.textMuted)),
                        Text(
                          '₹${cart.totalAmount.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900, color: AppColors.textPrimary),
                        ),
                      ],
                    ),
                    const Spacer(),
                    ElevatedButton(
                      onPressed: _showCartSheet,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.maroon,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 0,
                      ),
                      child: const Row(
                        children: [
                          Text('View Cart', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
                          SizedBox(width: 6),
                          Icon(Icons.arrow_forward_rounded, size: 16),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildCategoryCard({
    required int? id,
    required String title,
    required String subtitle,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 98,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? Colors.white : Colors.white.withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(
            color: isSelected ? AppColors.maroon : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: AppColors.maroon.withValues(alpha: 0.08), blurRadius: 10, offset: const Offset(0, 4))]
              : [],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(5),
              decoration: BoxDecoration(
                color: isSelected ? AppColors.maroon.withValues(alpha: 0.1) : const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 17, color: isSelected ? AppColors.maroon : const Color(0xFF64748B)),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11,
                height: 1.15,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? AppColors.maroon : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 9.5,
                height: 1.1,
                color: isSelected ? AppColors.maroon.withValues(alpha: 0.8) : AppColors.textMuted,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductCard(BuildContext context, Product product, CartProvider cart) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppColors.border),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image / Icon Thumbnail
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(21)),
                child: Container(
                  height: 105,
                  width: double.infinity,
                  color: const Color(0xFFF8FAFC),
                  child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                      ? Image.network(
                          product.imageUrl!,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const Icon(Icons.local_cafe_outlined, size: 36, color: AppColors.textMuted),
                        )
                      : const Center(child: Icon(Icons.local_cafe_outlined, size: 36, color: AppColors.textMuted)),
                ),
              ),

              // Popular Tag
              if (product.isPopular)
                Positioned(
                  top: 8,
                  left: 8,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.forestGreen,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Popular',
                      style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
            ],
          ),

          // Details
          Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '₹${product.price.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: AppColors.textPrimary),
                        ),
                        const Text(
                          '/ Portion',
                          style: TextStyle(fontSize: 9.5, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                    InkWell(
                      onTap: () {
                        cart.addToCart(product);
                      },
                      borderRadius: BorderRadius.circular(12),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.add, size: 16, color: AppColors.maroon),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _getCategoryIcon(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('cold') || lower.contains('shake') || lower.contains('juice')) {
      return Icons.water_drop_outlined;
    }
    if (lower.contains('hot') || lower.contains('tea') || lower.contains('coffee')) {
      return Icons.local_cafe_outlined;
    }
    if (lower.contains('snack') || lower.contains('burger') || lower.contains('sandwich')) {
      return Icons.restaurant;
    }
    return Icons.local_drink_outlined;
  }
}

// -------------------------------------------------------------
// Cart Bottom Sheet
// -------------------------------------------------------------
class _CartBottomSheet extends StatefulWidget {
  const _CartBottomSheet();

  @override
  State<_CartBottomSheet> createState() => _CartBottomSheetState();
}

class _CartBottomSheetState extends State<_CartBottomSheet> {
  final TextEditingController _discountController = TextEditingController();
  bool _isCheckingOut = false;

  @override
  void dispose() {
    _discountController.dispose();
    super.dispose();
  }

  Future<void> _handleConfirmPayment(BuildContext context) async {
    final cart = context.read<CartProvider>();
    final billProv = context.read<BillProvider>();

    if (cart.isEmpty) return;

    setState(() => _isCheckingOut = true);
    try {
      final bill = await billProv.createBill(cart);
      if (bill != null && mounted && context.mounted) {
        Navigator.pop(context); // Close bottom sheet
        ReceiptDialog.show(context, bill); // Open Receipt Preview modal
      }
    } catch (e) {
      debugPrint('Checkout error: $e');
    } finally {
      if (mounted) setState(() => _isCheckingOut = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartProvider>();

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 10, bottom: 6),
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(4)),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.shopping_bag_outlined, size: 20, color: AppColors.maroon),
                    const SizedBox(width: 8),
                    Text(
                      'Order Cart (${cart.itemCount})',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: AppColors.textPrimary),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () => cart.clearCart(),
                  child: const Text('Clear All', style: TextStyle(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: AppColors.border),

          // Items List
          Expanded(
            child: cart.isEmpty
                ? const Center(
                    child: Text('Your cart is empty', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: cart.itemsList.length,
                    separatorBuilder: (_, __) => const Divider(height: 16, color: AppColors.borderLight),
                    itemBuilder: (ctx, idx) {
                      final item = cart.itemsList[idx];
                      return Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.product.name,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                                ),
                                Text(
                                  '₹${item.product.price.toStringAsFixed(2)} each',
                                  style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),
                          // Qty Controls
                          Row(
                            children: [
                              _buildQtyBtn(Icons.remove, () => cart.decrementQuantity(item.product.id)),
                              Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 10),
                                child: Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                              ),
                              _buildQtyBtn(Icons.add, () => cart.addToCart(item.product)),
                            ],
                          ),
                          const SizedBox(width: 14),
                          Text(
                            '₹${item.lineTotal.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppColors.textPrimary),
                          ),
                        ],
                      );
                    },
                  ),
          ),

          // Bill Summary & Checkout Form
          Container(
            padding: const EdgeInsets.all(18),
            decoration: const BoxDecoration(
              color: Color(0xFFF8FAFC),
              border: Border(top: BorderSide(color: AppColors.border)),
            ),
            child: SafeArea(
              top: false,
              child: Column(
                children: [
                  // Payment Mode Selector
                  Row(
                    children: [
                      const Text(
                        'Payment Mode:',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textSecondary),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: ['CASH', 'UPI', 'CARD'].map((mode) {
                            final isSel = cart.paymentMode == mode;
                            return Padding(
                              padding: const EdgeInsets.only(left: 5),
                              child: InkWell(
                                onTap: () => cart.setPaymentMode(mode),
                                borderRadius: BorderRadius.circular(10),
                                child: AnimatedContainer(
                                  duration: const Duration(milliseconds: 150),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: isSel ? AppColors.maroon : Colors.white,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: isSel ? AppColors.maroon : AppColors.border,
                                      width: 1.2,
                                    ),
                                    boxShadow: isSel
                                        ? [
                                            BoxShadow(
                                              color: AppColors.maroon.withValues(alpha: 0.2),
                                              blurRadius: 4,
                                              offset: const Offset(0, 2),
                                            )
                                          ]
                                        : [],
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      if (isSel) ...[
                                        const Icon(Icons.check, size: 12, color: Colors.white),
                                        const SizedBox(width: 4),
                                      ],
                                      Text(
                                        mode,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: isSel ? Colors.white : AppColors.textPrimary,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Financial Breakdown
                  _buildPriceLine('Subtotal', '₹${cart.subtotal.toStringAsFixed(2)}'),
                  if (cart.discountAmount > 0)
                    _buildPriceLine('Discount', '-₹${cart.discountAmount.toStringAsFixed(2)}', isDiscount: true),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.textPrimary)),
                      Text(
                        '₹${cart.totalAmount.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 19, color: AppColors.maroon),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Confirm & Pay Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isCheckingOut || cart.isEmpty ? null : () => _handleConfirmPayment(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.maroon,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        elevation: 0,
                      ),
                      child: _isCheckingOut
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Confirm & Pay', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQtyBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 28,
        height: 28,
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, size: 14, color: AppColors.textPrimary),
      ),
    );
  }

  Widget _buildPriceLine(String label, String value, {bool isDiscount = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
          Text(
            value,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isDiscount ? AppColors.forestGreen : AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
