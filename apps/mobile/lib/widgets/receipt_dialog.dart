import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';
import '../core/theme.dart';
import '../models/bill.dart';

class ReceiptDialog extends StatefulWidget {
  final Bill bill;

  const ReceiptDialog({super.key, required this.bill});

  static void show(BuildContext context, Bill bill) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => ReceiptDialog(bill: bill),
    );
  }

  @override
  State<ReceiptDialog> createState() => _ReceiptDialogState();
}

class _ReceiptDialogState extends State<ReceiptDialog> {
  final ScreenshotController _screenshotController = ScreenshotController();
  bool _isSharing = false;

  Future<void> _shareReceiptPng() async {
    setState(() => _isSharing = true);
    try {
      final Uint8List? imageBytes = await _screenshotController.capture(
        delay: const Duration(milliseconds: 100),
      );

      if (imageBytes != null) {
        final directory = await getTemporaryDirectory();
        final imagePath = '${directory.path}/MagicMug_Bill_${widget.bill.billNumber}.png';
        final imageFile = File(imagePath);
        await imageFile.writeAsBytes(imageBytes);

        await SharePlus.instance.share(
          ShareParams(
            files: [XFile(imagePath)],
            text: 'Magic Mug Bill #${widget.bill.billNumber}',
          ),
        );
      }
    } catch (e) {
      debugPrint('Error sharing receipt: $e');
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bill = widget.bill;
    final isVoid = bill.status == 'VOID';
    final dateFormat = DateFormat('MMM dd, yyyy, hh:mm:ss a');

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 380),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 20,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Modal Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
                border: Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.print_outlined, size: 18, color: AppColors.maroon),
                  const SizedBox(width: 8),
                  const Text(
                    'Receipt Preview',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18, color: AppColors.textMuted),
                    onPressed: () => Navigator.pop(context),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),

            // Thermal Receipt Paper (Capturable)
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Screenshot(
                  controller: _screenshotController,
                  child: Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Logo
                        Center(
                          child: SizedBox(
                            width: 64,
                            height: 64,
                            child: Image.asset('assets/logo.png', fit: BoxFit.contain),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'MAGIC MUG',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2.0,
                            color: const Color(0xFF18181B),
                          ),
                        ),
                        Text(
                          'Not Just COFFEE',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 9.5,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF52525B),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'No 13/21, Avant Garde, Road, Nehru St, opposite to Turf Genesis, Nehru Nagar West, Coimbatore, Tamil Nadu 641014',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 8.5,
                            color: const Color(0xFF71717A),
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 12),
                        const _DashedLine(),
                        const SizedBox(height: 10),

                        // Bill Meta
                        _buildMetaRow('Bill No:', bill.billNumber, isBold: true),
                        const SizedBox(height: 4),
                        _buildMetaRow('Date & Time:', dateFormat.format(bill.billDate.toLocal())),
                        const SizedBox(height: 4),
                        _buildMetaRow('Cashier:', bill.creatorName ?? 'Magic Mug'),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Status:',
                              style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF71717A)),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                              decoration: BoxDecoration(
                                color: isVoid ? AppColors.errorBg : AppColors.successBg,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                bill.status,
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: isVoid ? AppColors.error : AppColors.success,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        const _DashedLine(),
                        const SizedBox(height: 10),

                        // Line Items Table Header
                        Row(
                          children: [
                            Expanded(
                              flex: 4,
                              child: Text('ITEM', style: GoogleFonts.jetBrainsMono(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF71717A))),
                            ),
                            Expanded(
                              flex: 1,
                              child: Text('QTY', textAlign: TextAlign.center, style: GoogleFonts.jetBrainsMono(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF71717A))),
                            ),
                            Expanded(
                              flex: 2,
                              child: Text('RATE', textAlign: TextAlign.right, style: GoogleFonts.jetBrainsMono(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF71717A))),
                            ),
                            Expanded(
                              flex: 2,
                              child: Text('AMT', textAlign: TextAlign.right, style: GoogleFonts.jetBrainsMono(fontSize: 9, fontWeight: FontWeight.bold, color: const Color(0xFF71717A))),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Divider(height: 1, color: Color(0xFFE4E4E7)),
                        const SizedBox(height: 6),

                        // Items
                        ...bill.items.map((item) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                flex: 4,
                                child: Text(item.productName, style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF18181B))),
                              ),
                              Expanded(
                                flex: 1,
                                child: Text('${item.quantity}', textAlign: TextAlign.center, style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF3F3F46))),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text('₹${item.unitPrice.toStringAsFixed(2)}', textAlign: TextAlign.right, style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF52525B))),
                              ),
                              Expanded(
                                flex: 2,
                                child: Text('₹${item.lineTotal.toStringAsFixed(2)}', textAlign: TextAlign.right, style: GoogleFonts.jetBrainsMono(fontSize: 10, fontWeight: FontWeight.bold, color: const Color(0xFF09090B))),
                              ),
                            ],
                          ),
                        )),

                        const SizedBox(height: 10),
                        const _DashedLine(),
                        const SizedBox(height: 10),

                        // Financials
                        _buildSummaryRow('Subtotal:', '₹${bill.subtotal.toStringAsFixed(2)}'),
                        if (bill.discountAmount > 0) ...[
                          const SizedBox(height: 4),
                          _buildSummaryRow('Discount:', '-₹${bill.discountAmount.toStringAsFixed(2)}', isDiscount: true),
                        ],
                        const SizedBox(height: 6),
                        const Divider(height: 1, color: Color(0xFFD4D4D8)),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'TOTAL:',
                              style: GoogleFonts.jetBrainsMono(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF09090B)),
                            ),
                            Text(
                              '₹${bill.totalAmount.toStringAsFixed(2)}',
                              style: GoogleFonts.jetBrainsMono(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF09090B)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        _buildSummaryRow('Payment Mode:', bill.paymentMode, isBold: true),
                        const SizedBox(height: 14),

                        // Footer
                        Text(
                          'THANK YOU FOR VISITING!',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(fontSize: 9.5, fontWeight: FontWeight.bold, color: const Color(0xFF18181B)),
                        ),
                        Text(
                          'Follow us on Instagram @magicmug_cbe',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(fontSize: 8.5, color: const Color(0xFF71717A)),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'POWERED BY',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 7.5,
                            letterSpacing: 1.4,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF94A3B8),
                          ),
                        ),
                        const SizedBox(height: 5),
                        Center(
                          child: Image.asset(
                            'assets/growera_logo.png',
                            height: 24,
                            fit: BoxFit.contain,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Modal Actions
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(24),
                  bottomRight: Radius.circular(24),
                ),
                border: Border(top: BorderSide(color: AppColors.border)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.border),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                      child: const Text('Close', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _isSharing ? null : _shareReceiptPng,
                      icon: _isSharing
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.share_outlined, size: 14),
                      label: const Text('Share', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.forestGreen,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      icon: const Icon(Icons.print_outlined, size: 14),
                      label: const Text('Print', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.maroon,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetaRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF71717A))),
        Text(
          value,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 10,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
            color: const Color(0xFF18181B),
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false, bool isDiscount = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.jetBrainsMono(fontSize: 10, color: const Color(0xFF71717A))),
        Text(
          value,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 10.5,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: isDiscount ? AppColors.forestGreen : const Color(0xFF18181B),
          ),
        ),
      ],
    );
  }
}

class _DashedLine extends StatelessWidget {
  const _DashedLine();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final boxWidth = constraints.constrainWidth();
        const dashWidth = 4.0;
        const dashHeight = 1.0;
        final dashCount = (boxWidth / (2 * dashWidth)).floor();
        return Flex(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          direction: Axis.horizontal,
          children: List.generate(dashCount, (_) {
            return const SizedBox(
              width: dashWidth,
              height: dashHeight,
              child: DecoratedBox(
                decoration: BoxDecoration(color: Color(0xFFA1A1AA)),
              ),
            );
          }),
        );
      },
    );
  }
}
