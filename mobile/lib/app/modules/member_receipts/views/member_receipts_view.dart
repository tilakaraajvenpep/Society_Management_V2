import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/utils/api_client.dart';
import '../../../core/utils/constants.dart';
import '../../member_home/controllers/member_home_controller.dart';

class MemberReceiptsView extends StatelessWidget {
  const MemberReceiptsView({super.key});

  Future<void> _downloadReceipt(dynamic paymentId) async {
    if (paymentId == null) return;
    try {
      final ApiClient apiClient = Get.find<ApiClient>();
      final token = await apiClient.storage.read(key: 'jwt_token') ?? '';
      final url = '${AppConstants.baseOrigin}/api/payments/$paymentId/receipt-html?token=$token&autoPrint=true';
      final uri = Uri.parse(url);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        Get.snackbar(
          'Download Receipt',
          'Opening receipt link...',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.amber[800],
          colorText: Colors.white,
        );
      }
    } catch (e) {
      Get.snackbar('Error', 'Unable to open receipt download: $e',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
    }
  }

  @override
  Widget build(BuildContext context) {
    final MemberHomeController homeCtrl = Get.find<MemberHomeController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Maintenance Receipts', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: homeCtrl.fetchProfile,
            tooltip: 'Refresh Receipts',
          ),
        ],
      ),
      body: Obx(() {
        if (homeCtrl.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        final member = homeCtrl.memberData;
        final rawPayments = member['payments'] as List<dynamic>? ?? [];
        final receipts = rawPayments.where((p) => p['status'] == 'PAID' && p['receiptNumber'] != null).toList();

        if (receipts.isEmpty) {
          return RefreshIndicator(
            onRefresh: homeCtrl.fetchProfile,
            child: ListView(
              children: [
                SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                Center(
                  child: Column(
                    children: [
                      Icon(Icons.receipt_long_outlined, size: 64, color: Colors.grey[300]),
                      const SizedBox(height: 14),
                      const Text('No official receipts issued yet', style: TextStyle(color: Colors.grey, fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 6),
                      Text('Approved maintenance payments will appear here with downloadable receipts.',
                          style: TextStyle(color: Colors.grey[400], fontSize: 12), textAlign: TextAlign.center),
                    ],
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: homeCtrl.fetchProfile,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: receipts.length,
            itemBuilder: (context, index) {
              final r = receipts[index];
              return _buildReceiptCard(r, member, context);
            },
          ),
        );
      }),
    );
  }

  Widget _buildReceiptCard(Map receipt, Map member, BuildContext context) {
    final receiptNo = receipt['receiptNumber'] ?? 'REC-XXXX';
    final amount = receipt['amount'] ?? 0;
    final date = AppConstants.formatDate(receipt['paymentDate']);
    final mode = receipt['mode'] ?? 'ONLINE';
    final period = receipt['periodLabel'] ?? 'Maintenance';

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _openReceiptSheet(receipt, member),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10b981).withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.receipt_long, color: Color(0xFF10b981), size: 24),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          receiptNo,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, fontFamily: 'monospace'),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '$period • $mode',
                          style: TextStyle(color: Colors.grey[700], fontSize: 12),
                        ),
                        Text(
                          date,
                          style: TextStyle(color: Colors.grey[500], fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        AppConstants.formatCurrency(amount),
                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF2563eb)),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10b981).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text('PAID', style: TextStyle(color: Color(0xFF10b981), fontSize: 10, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton.icon(
                    onPressed: () => _openReceiptSheet(receipt, member),
                    icon: const Icon(Icons.visibility_outlined, size: 16, color: Colors.grey),
                    label: const Text('View Details', style: TextStyle(color: Colors.grey, fontSize: 12)),
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      minimumSize: Size.zero,
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _downloadReceipt(receipt['id']),
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('Download / Print PDF', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563eb),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openReceiptSheet(Map receipt, Map member) {
    final tenant = member['tenant'] ?? {};
    final lateFee = (receipt['lateFee'] ?? 0.0).toDouble();
    final discount = (receipt['discount'] ?? 0.0).toDouble();
    final total = (receipt['amount'] ?? 0.0).toDouble();
    final baseAmount = total - lateFee + discount;

    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Receipt Header
              Center(
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563eb).withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.apartment, color: Color(0xFF2563eb), size: 32),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      tenant['name'] ?? 'Society Management',
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                      textAlign: TextAlign.center,
                    ),
                    if (tenant['address'] != null)
                      Text(tenant['address'], style: TextStyle(color: Colors.grey[600], fontSize: 11), textAlign: TextAlign.center),
                    const SizedBox(height: 4),
                    const Text('OFFICIAL PAYMENT RECEIPT', style: TextStyle(color: Color(0xFF2563eb), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
                  ],
                ),
              ),
              const Divider(height: 28),

              _row('Receipt Number', receipt['receiptNumber'] ?? '-', isBold: true),
              _row('Date of Payment', AppConstants.formatDate(receipt['paymentDate'])),
              _row('Received From', '${member['name']}'),
              _row('Flat / Unit No', '${member['flatNo']}'),
              _row('Payment Mode', receipt['mode'] ?? 'BANK_TRANSFER'),
              if (receipt['referenceNumber'] != null)
                _row('Reference / UTR', receipt['referenceNumber']),
              if (receipt['periodLabel'] != null)
                _row('Period Covered', receipt['periodLabel']),

              const Divider(height: 24),
              _row('Base Maintenance', AppConstants.formatCurrency(baseAmount)),
              if (discount > 0)
                _row('Early Bird Discount', '- ${AppConstants.formatCurrency(discount)}', valueColor: const Color(0xFF10b981)),
              if (lateFee > 0)
                _row('Late Fee', '+ ${AppConstants.formatCurrency(lateFee)}', valueColor: const Color(0xFFef4444)),

              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Amount Paid', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                  Text(
                    AppConstants.formatCurrency(total),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: Color(0xFF2563eb)),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Verification Stamp
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF10b981).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF10b981).withOpacity(0.3)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.verified, color: Color(0xFF10b981), size: 18),
                    SizedBox(width: 6),
                    Text('OFFICIALLY VERIFIED & APPROVED', style: TextStyle(color: Color(0xFF10b981), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Download / Print Action
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563eb),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => _downloadReceipt(receipt['id']),
                  icon: const Icon(Icons.download, size: 20),
                  label: const Text('Download / Print PDF Receipt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Get.back(),
                  child: const Text('Close'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value, {bool isBold = false, Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          Text(
            value,
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              fontSize: 13,
              color: valueColor ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
