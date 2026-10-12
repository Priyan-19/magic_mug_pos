import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../core/theme.dart';
import '../models/expense.dart';
import '../providers/expense_provider.dart';
import '../widgets/custom_top_bar.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ExpenseProvider>().fetchExpenses();
    });
  }

  void _showLogExpenseDialog(BuildContext context) {
    final expenseProv = context.read<ExpenseProvider>();
    final amountController = TextEditingController();
    final descController = TextEditingController();
    String selectedCategory = 'RAW_MATERIALS';
    String selectedPaymentMode = 'CASH';

    final categories = [
      {'id': 'RAW_MATERIALS', 'label': 'Raw Materials (Milk, Coffee, Bread)'},
      {'id': 'UTILITIES', 'label': 'Utilities (Electricity, Water, Gas)'},
      {'id': 'RENT', 'label': 'Shop Rent'},
      {'id': 'SALARIES', 'label': 'Staff Salaries / Wages'},
      {'id': 'MAINTENANCE', 'label': 'Maintenance & Repairs'},
      {'id': 'MARKETING', 'label': 'Marketing & Social Media'},
      {'id': 'OTHER', 'label': 'Other Miscellaneous'},
    ];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Log Cafe Expense', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () => Navigator.pop(ctx),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: amountController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(labelText: 'Amount (₹)'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: selectedCategory,
                    decoration: const InputDecoration(labelText: 'Expense Category'),
                    items: categories.map((c) {
                      return DropdownMenuItem<String>(
                        value: c['id'],
                        child: Text(c['label']!, style: const TextStyle(fontSize: 12)),
                      );
                    }).toList(),
                    onChanged: (val) => setModalState(() => selectedCategory = val!),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descController,
                    decoration: const InputDecoration(labelText: 'Description (e.g. 5L Fresh Milk purchase)'),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: selectedPaymentMode,
                    decoration: const InputDecoration(labelText: 'Payment Mode'),
                    items: const [
                      DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                      DropdownMenuItem(value: 'UPI', child: Text('UPI / GPay')),
                      DropdownMenuItem(value: 'CARD', child: Text('Bank Card')),
                    ],
                    onChanged: (val) => setModalState(() => selectedPaymentMode = val!),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () async {
                        final amount = double.tryParse(amountController.text.trim()) ?? 0.0;
                        final desc = descController.text.trim();
                        if (amount <= 0 || desc.isEmpty) return;

                        final success = await expenseProv.createExpense(
                          category: selectedCategory,
                          amount: amount,
                          description: desc,
                          paymentMode: selectedPaymentMode,
                        );

                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(success ? 'Expense logged successfully' : 'Failed to log expense'),
                              backgroundColor: success ? AppColors.forestGreen : AppColors.error,
                            ),
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.maroon,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: const Text('Save Expense', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final expenseProv = context.watch<ExpenseProvider>();
    final dateFormat = DateFormat('dd MMM yyyy');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: const CustomTopBar(title: 'Expenses'),
      body: Column(
        children: [
          // Total Overhead Banner
          Container(
            margin: const EdgeInsets.all(14),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF741A23), Color(0xFF5A141B)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(22),
              boxShadow: [
                BoxShadow(
                  color: AppColors.maroon.withValues(alpha: 0.2),
                  blurRadius: 14,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Total Logged Expenses', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(
                      '₹${expenseProv.totalExpenseAmount.toStringAsFixed(2)}',
                      style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.w900),
                    ),
                    Text(
                      '${expenseProv.expenses.length} records logged',
                      style: const TextStyle(color: Colors.white60, fontSize: 10),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: () => _showLogExpenseDialog(context),
                  icon: const Icon(Icons.add, size: 14),
                  label: const Text('Log Expense', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AppColors.maroon,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ],
            ),
          ),

          // Expenses List
          Expanded(
            child: expenseProv.isLoading && expenseProv.expenses.isEmpty
                ? const Center(child: CircularProgressIndicator(color: AppColors.maroon))
                : expenseProv.expenses.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.account_balance_wallet_outlined, size: 44, color: Colors.grey.shade400),
                            const SizedBox(height: 10),
                            const Text('No expenses logged yet', style: TextStyle(color: AppColors.textMuted, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: AppColors.maroon,
                        onRefresh: () => expenseProv.fetchExpenses(),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(14, 0, 14, 14),
                          itemCount: expenseProv.expenses.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (ctx, idx) {
                            final exp = expenseProv.expenses[idx];
                            return _buildExpenseCard(exp, dateFormat);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpenseCard(Expense exp, DateFormat dateFormat) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.errorBg,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.receipt_long_outlined, size: 16, color: AppColors.error),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  exp.description,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Text(
                      exp.category.replaceAll('_', ' '),
                      style: const TextStyle(fontSize: 10, color: AppColors.textSecondary, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '• ${dateFormat.format(exp.expenseDate)}',
                      style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Text(
            '₹${exp.amount.toStringAsFixed(2)}',
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppColors.error),
          ),
        ],
      ),
    );
  }
}
