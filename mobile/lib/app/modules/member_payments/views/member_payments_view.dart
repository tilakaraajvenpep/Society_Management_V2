import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/utils/constants.dart';
import '../controllers/member_payments_controller.dart';
import '../../member_home/controllers/member_home_controller.dart';

class MemberPaymentsView extends GetView<MemberPaymentsController> {
  const MemberPaymentsView({super.key});

  @override
  Widget build(BuildContext context) {
    final MemberHomeController homeCtrl = Get.find<MemberHomeController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Maintenance & Payments', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: controller.fetchPayments,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        final member = homeCtrl.memberData;
        final dues = (member['outstandingDues'] ?? 0.0).toDouble();
        final paidUntil = member['paidUntil'] != null ? AppConstants.formatDate(member['paidUntil']) : 'Not set';

        final summary = controller.duesSummary;
        final paidMonths = summary['paidMonthsCount'] ?? controller.monthlyLedger.where((m) => m['status'] == 'PAID').length;
        final dueMonths = summary['dueMonthsCount'] ?? controller.monthlyLedger.where((m) => m['status'] == 'DUE').length;

        return RefreshIndicator(
          onRefresh: controller.fetchPayments,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Dues & Quick Pay Banner with Monthly Progress
              _buildDuesOverviewCard(dues, paidUntil, paidMonths, dueMonths, context),
              const SizedBox(height: 20),

              // Segmented Tab Selector (Monthly Ledger vs Payment History)
              _buildViewTabSelector(),
              const SizedBox(height: 16),

              // View Content based on selected tab
              if (controller.selectedViewTab.value == 0)
                _buildMonthlyLedgerSection(context)
              else
                _buildPaymentHistorySection(context),
            ],
          ),
        );
      }),
    );
  }

  Widget _buildDuesOverviewCard(double dues, String paidUntil, int paidMonths, int dueMonths, BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1e3a8a), Color(0xFF2563eb)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563eb).withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('OUTSTANDING DUES', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.event_available, color: Colors.white, size: 14),
                    const SizedBox(width: 4),
                    Text(
                      'Paid until: $paidUntil',
                      style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            AppConstants.formatCurrency(dues),
            style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 14),

          // Monthly Progress Pills
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _progressItem(
                  icon: Icons.check_circle_outline,
                  color: const Color(0xFF34d399),
                  label: 'Paid Months',
                  value: '$paidMonths / 12',
                ),
                Container(height: 24, width: 1, color: Colors.white24),
                _progressItem(
                  icon: Icons.pending_actions,
                  color: const Color(0xFFfbbf24),
                  label: 'Pending Due',
                  value: '$dueMonths / 12',
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.white,
                foregroundColor: const Color(0xFF2563eb),
                padding: const EdgeInsets.symmetric(vertical: 12),
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () => _openPaymentBottomSheet(context),
              icon: const Icon(Icons.payment, size: 18),
              label: const Text('Pay Maintenance Fee', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _progressItem({required IconData icon, required Color color, required String label, required String value}) {
    return Row(
      children: [
        Icon(icon, color: color, size: 16),
        const SizedBox(width: 6),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
            Text(value, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
          ],
        ),
      ],
    );
  }

  Widget _buildViewTabSelector() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(12),
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () => controller.selectedViewTab.value = 0,
              borderRadius: BorderRadius.circular(10),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: controller.selectedViewTab.value == 0 ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: controller.selectedViewTab.value == 0
                      ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4, offset: const Offset(0, 2))]
                      : [],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.calendar_month,
                      size: 16,
                      color: controller.selectedViewTab.value == 0 ? const Color(0xFF2563eb) : Colors.grey[600],
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Monthly Ledger',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: controller.selectedViewTab.value == 0 ? const Color(0xFF2563eb) : Colors.grey[700],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: InkWell(
              onTap: () => controller.selectedViewTab.value = 1,
              borderRadius: BorderRadius.circular(10),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: controller.selectedViewTab.value == 1 ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: controller.selectedViewTab.value == 1
                      ? [BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 4, offset: const Offset(0, 2))]
                      : [],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.history,
                      size: 16,
                      color: controller.selectedViewTab.value == 1 ? const Color(0xFF2563eb) : Colors.grey[600],
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Payment History',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: controller.selectedViewTab.value == 1 ? const Color(0xFF2563eb) : Colors.grey[700],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ───────── Monthly Ledger (Due Pending vs Paid Breakdown) ─────────
  Widget _buildMonthlyLedgerSection(BuildContext context) {
    final ledger = controller.monthlyLedger;

    if (ledger.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(vertical: 40),
        alignment: Alignment.center,
        child: Column(
          children: [
            Icon(Icons.calendar_today_outlined, size: 56, color: Colors.grey[300]),
            const SizedBox(height: 12),
            const Text('Loading month-by-month dues...', style: TextStyle(color: Colors.grey, fontSize: 14)),
          ],
        ),
      );
    }

    final totalCount = ledger.length;
    final paidCount = ledger.where((m) => m['status'] == 'PAID').length;
    final dueCount = ledger.where((m) => m['status'] == 'DUE').length;

    // Filter items
    final filter = controller.ledgerFilter.value;
    final filteredLedger = ledger.where((m) {
      if (filter == 'PAID') return m['status'] == 'PAID';
      if (filter == 'DUE') return m['status'] == 'DUE';
      return true;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Filter Chips Row
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _filterChip('ALL', 'All Months ($totalCount)'),
              const SizedBox(width: 8),
              _filterChip('DUE', 'Due Pending ($dueCount)', color: const Color(0xFFef4444)),
              const SizedBox(width: 8),
              _filterChip('PAID', 'Paid ($paidCount)', color: const Color(0xFF10b981)),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // List of Month Cards
        ...filteredLedger.map((month) => _buildMonthCard(month, context)),
      ],
    );
  }

  Widget _filterChip(String filterKey, String label, {Color? color}) {
    final isSelected = controller.ledgerFilter.value == filterKey;
    final chipColor = color ?? const Color(0xFF2563eb);

    return InkWell(
      onTap: () => controller.ledgerFilter.value = filterKey,
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? chipColor : Colors.grey[100],
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? chipColor : Colors.grey[300]!),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : Colors.grey[700],
          ),
        ),
      ),
    );
  }

  Widget _buildMonthCard(Map<String, dynamic> month, BuildContext context) {
    final status = month['status'] ?? 'DUE';
    final isPaid = status == 'PAID';
    final isPending = status == 'PENDING_APPROVAL';
    final isOverdue = month['isOverdue'] == true;
    final label = month['label'] ?? 'Month';
    final amount = month['amount'] ?? 0;
    final receiptNo = month['receiptNumber'];
    final paymentId = month['paymentId'];

    final statusColor = isPaid
        ? const Color(0xFF10b981)
        : (isPending
            ? const Color(0xFFf59e0b)
            : (isOverdue ? const Color(0xFFef4444) : const Color(0xFFf97316)));

    final statusLabel = isPaid
        ? 'PAID'
        : (isPending
            ? 'APPROVAL PENDING'
            : (isOverdue ? 'OVERDUE' : 'DUE PENDING'));

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: statusColor.withOpacity(0.3), width: 1.2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    isPaid ? Icons.check_circle : (isPending ? Icons.hourglass_top : Icons.calendar_today),
                    color: statusColor,
                    size: 22,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: statusColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              statusLabel,
                              style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                            ),
                          ),
                          if (receiptNo != null) ...[
                            const SizedBox(width: 6),
                            Text(
                              receiptNo,
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace', color: Color(0xFF2563eb)),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                Text(
                  AppConstants.formatCurrency(amount),
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 17,
                    color: isPaid ? const Color(0xFF10b981) : const Color(0xFF0f172a),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 8),

            // Action Row
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (isPaid && paymentId != null) ...[
                  ElevatedButton.icon(
                    onPressed: () => controller.downloadReceipt(paymentId),
                    icon: const Icon(Icons.download, size: 16),
                    label: const Text('Download Receipt (PDF)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563eb),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ] else if (!isPaid && !isPending) ...[
                  ElevatedButton.icon(
                    onPressed: () => _openPaymentBottomSheet(context),
                    icon: const Icon(Icons.payment, size: 16),
                    label: const Text('Pay This Month', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563eb),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ] else if (isPending) ...[
                  const Text('Payment submitted • Awaiting treasurer verification', style: TextStyle(color: Color(0xFFf59e0b), fontSize: 11, fontWeight: FontWeight.w500)),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ───────── Payment Submissions & History ─────────
  Widget _buildPaymentHistorySection(BuildContext context) {
    if (controller.payments.isEmpty) {
      return _buildEmptyState();
    }
    return Column(
      children: controller.payments.map((p) => _buildPaymentCard(p, context)).toList(),
    );
  }

  Widget _buildPaymentCard(dynamic payment, BuildContext context) {
    final status = payment['status'] ?? 'PENDING';
    final amount = payment['amount'] ?? 0;
    final date = AppConstants.formatDate(payment['createdAt'] ?? payment['paymentDate']);
    final receiptNo = payment['receiptNumber'];
    final refNumber = payment['referenceNumber'];
    final mode = payment['mode'] ?? 'BANK_TRANSFER';
    final proofUrl = payment['proofUrl'];
    final rejectionReason = payment['rejectionReason'];

    Color statusColor;
    String statusText;
    switch (status) {
      case 'PAID':
        statusColor = const Color(0xFF10b981);
        statusText = 'APPROVED';
        break;
      case 'REJECTED':
        statusColor = const Color(0xFFef4444);
        statusText = 'REJECTED';
        break;
      case 'PENDING':
      default:
        statusColor = const Color(0xFFf59e0b);
        statusText = 'PENDING';
        break;
    }

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    AppConstants.formatCurrency(amount),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        statusText,
                        style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              '${payment['periodLabel'] ?? 'Maintenance'} • Mode: $mode',
              style: TextStyle(color: Colors.grey[700], fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 2),
            Text(
              'Submitted: $date${receiptNo != null ? ' • Receipt: $receiptNo' : ''}',
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),

            if (refNumber != null && refNumber.toString().isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.tag, size: 14, color: Colors.grey),
                    const SizedBox(width: 4),
                    Text('UTR: $refNumber', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, fontFamily: 'monospace')),
                  ],
                ),
              ),
            ],

            if (rejectionReason != null && rejectionReason.toString().isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFef4444).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFef4444).withOpacity(0.3)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline, size: 16, color: Color(0xFFef4444)),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Admin Note: $rejectionReason',
                        style: const TextStyle(fontSize: 12, color: Color(0xFFef4444), fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 8),

            // Action Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (proofUrl != null && proofUrl.toString().isNotEmpty)
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      foregroundColor: const Color(0xFF2563eb),
                    ),
                    onPressed: () => _showProofDialog(proofUrl.toString()),
                    icon: const Icon(Icons.image, size: 16),
                    label: const Text('View Proof', style: TextStyle(fontSize: 12)),
                  ),
                if (status == 'PAID' && receiptNo != null) ...[
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF2563eb),
                      side: const BorderSide(color: Color(0xFF2563eb)),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () => _showReceiptDialog(payment, context),
                    icon: const Icon(Icons.visibility, size: 14),
                    label: const Text('View', style: TextStyle(fontSize: 12)),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563eb),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () => controller.downloadReceipt(payment['id']),
                    icon: const Icon(Icons.download, size: 14),
                    label: const Text('PDF', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40),
      alignment: Alignment.center,
      child: Column(
        children: [
          Icon(Icons.receipt_long_outlined, size: 56, color: Colors.grey[300]),
          const SizedBox(height: 12),
          const Text('No payment submissions found', style: TextStyle(color: Colors.grey, fontSize: 14)),
        ],
      ),
    );
  }

  void _showProofDialog(String proofUrl) {
    final fullUrl = AppConstants.resolveImageUrl(proofUrl);
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Payment Proof Screenshot', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Get.back()),
                ],
              ),
            ),
            Container(
              constraints: const BoxConstraints(maxHeight: 400),
              color: Colors.black12,
              child: Image.network(
                fullUrl,
                fit: BoxFit.contain,
                loadingBuilder: (ctx, child, progress) {
                  if (progress == null) return child;
                  return const Center(child: CircularProgressIndicator());
                },
                errorBuilder: (_, __, ___) => const Padding(
                  padding: EdgeInsets.all(32),
                  child: Center(child: Text('Unable to load proof screenshot', style: TextStyle(color: Colors.grey))),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: TextButton(
                onPressed: () => Get.back(),
                child: const Text('Close'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showReceiptDialog(Map payment, BuildContext context) {
    final MemberHomeController homeCtrl = Get.find<MemberHomeController>();
    final member = homeCtrl.memberData;
    final tenant = member['tenant'] ?? {};

    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: const BoxDecoration(
                        color: Color(0xFF2563eb),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.check, color: Colors.white, size: 28),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      tenant['name'] ?? 'Society Management',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                      textAlign: TextAlign.center,
                    ),
                    const Text('OFFICIAL PAYMENT RECEIPT', style: TextStyle(color: Colors.grey, fontSize: 11, letterSpacing: 1)),
                  ],
                ),
              ),
              const Divider(height: 24),
              _receiptRow('Receipt Number', payment['receiptNumber'] ?? '-'),
              _receiptRow('Payment Date', AppConstants.formatDate(payment['paymentDate'])),
              _receiptRow('Received From', '${member['name']} (Flat: ${member['flatNo']})'),
              _receiptRow('Payment Mode', payment['mode'] ?? 'BANK_TRANSFER'),
              if (payment['referenceNumber'] != null)
                _receiptRow('Reference / UTR', payment['referenceNumber']),
              _receiptRow('Period Covered', payment['periodLabel'] ?? 'Maintenance'),
              const Divider(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Amount Paid', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(
                    AppConstants.formatCurrency(payment['amount']),
                    style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 20, color: Color(0xFF2563eb)),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Download PDF Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563eb),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => controller.downloadReceipt(payment['id']),
                  icon: const Icon(Icons.download, size: 18),
                  label: const Text('Download / Print PDF Receipt', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 8),
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

  Widget _receiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
        ],
      ),
    );
  }

  void _openPaymentBottomSheet(BuildContext context) {
    final MemberHomeController homeCtrl = Get.find<MemberHomeController>();
    final member = homeCtrl.memberData;
    final tenant = member['tenant'] ?? {};

    final bankAccName = tenant['bankAccountName'] ?? tenant['name'] ?? 'Society Account';
    final bankName = tenant['bankName'] ?? 'Bank Account';
    final bankAccNo = tenant['bankAccountNumber'] ?? 'Not configured';
    final bankIfsc = tenant['bankIfsc'] ?? 'Not configured';
    final bankUpiId = tenant['bankUpiId'] ?? '';
    final bankQrUrl = tenant['bankQrCodeUrl'];
    final isRefRequired = tenant['bankReferenceRequired'] != false;
    final isProofRequired = tenant['bankProofRequired'] != false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          builder: (_, scrollController) {
            return Obx(() {
              return ListView(
                controller: scrollController,
                padding: const EdgeInsets.all(20),
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Pay Maintenance Fee', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),

                  // Method Switcher: Online vs Offline Bank Transfer
                  Container(
                    decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(10)),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => controller.paymentMethodTab.value = 0,
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: controller.paymentMethodTab.value == 0 ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: controller.paymentMethodTab.value == 0
                                    ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)]
                                    : [],
                              ),
                              child: Center(
                                child: Text(
                                  'Online (Instant)',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: controller.paymentMethodTab.value == 0 ? const Color(0xFF2563eb) : Colors.grey[600],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: InkWell(
                            onTap: () => controller.paymentMethodTab.value = 1,
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 8),
                              decoration: BoxDecoration(
                                color: controller.paymentMethodTab.value == 1 ? Colors.white : Colors.transparent,
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: controller.paymentMethodTab.value == 1
                                    ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 4)]
                                    : [],
                              ),
                              child: Center(
                                child: Text(
                                  'Bank Transfer & QR',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: controller.paymentMethodTab.value == 1 ? const Color(0xFF2563eb) : Colors.grey[600],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  if (controller.paymentMethodTab.value == 0) ...[
                    // Tab 0: Online Payment notice
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563eb).withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF2563eb).withOpacity(0.3)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.bolt, color: Color(0xFF2563eb)),
                              SizedBox(width: 8),
                              Text('Instant Online Gateway', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563eb))),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Pay securely via UPI, NetBanking, Debit/Credit Cards. Receipts are automatically generated and available instantly upon completion.',
                            style: TextStyle(color: Colors.grey[700], fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    _planOption('MONTHLY', 'Monthly', controller.calculatePlanAmount('MONTHLY')),
                    _planOption('QUARTERLY', 'Quarterly (3 Months)', controller.calculatePlanAmount('QUARTERLY')),
                    _planOption('HALF_YEARLY', 'Half-Yearly (6 Months)', controller.calculatePlanAmount('HALF_YEARLY')),
                    _planOption('ANNUAL', 'Annual (12 Months)', controller.calculatePlanAmount('ANNUAL')),
                    const SizedBox(height: 20),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563eb),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      onPressed: () {
                        Get.back();
                        Get.snackbar(
                          'Payment Gateway',
                          'Redirecting to payment gateway for ${AppConstants.formatCurrency(controller.calculatePlanAmount(controller.selectedPlan.value))}...',
                          snackPosition: SnackPosition.BOTTOM,
                          backgroundColor: const Color(0xFF2563eb),
                          colorText: Colors.white,
                        );
                      },
                      child: Text('Pay ${AppConstants.formatCurrency(controller.calculatePlanAmount(controller.selectedPlan.value))} Now'),
                    ),
                  ] else ...[
                    // Tab 1: Bank Transfer & QR View
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.grey[50],
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey[200]!),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(
                            children: [
                              Icon(Icons.account_balance, color: Color(0xFF2563eb), size: 20),
                              SizedBox(width: 8),
                              Text('Society Bank Account Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                          const Divider(height: 20),
                          _bankDetailRow('Account Name', bankAccName),
                          _bankDetailRow('Bank Name', bankName),
                          _bankDetailRow('Account Number', bankAccNo, canCopy: true),
                          _bankDetailRow('IFSC Code', bankIfsc, canCopy: true),
                          if (bankUpiId.isNotEmpty)
                            _bankDetailRow('UPI ID', bankUpiId, canCopy: true),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Society QR Code Image
                    if (bankQrUrl != null && bankQrUrl.toString().isNotEmpty) ...[
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Column(
                          children: [
                            const Text('Scan Society UPI QR Code', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            const SizedBox(height: 10),
                            Container(
                              height: 200,
                              width: 200,
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                border: Border.all(color: Colors.grey[200]!),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Image.network(
                                AppConstants.resolveImageUrl(bankQrUrl.toString()),
                                fit: BoxFit.contain,
                                loadingBuilder: (ctx, child, progress) {
                                  if (progress == null) return child;
                                  return const Center(child: CircularProgressIndicator(strokeWidth: 2));
                                },
                                errorBuilder: (_, error, ___) => Center(
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.qr_code_2, size: 48, color: Colors.grey),
                                      const SizedBox(height: 6),
                                      Text('QR Code', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Plan Selector
                    const Text('Select Maintenance Period Plan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 8),
                    _planOption('MONTHLY', 'Monthly', controller.calculatePlanAmount('MONTHLY')),
                    _planOption('QUARTERLY', 'Quarterly (3 Months)', controller.calculatePlanAmount('QUARTERLY')),
                    _planOption('HALF_YEARLY', 'Half-Yearly (6 Months)', controller.calculatePlanAmount('HALF_YEARLY')),
                    _planOption('ANNUAL', 'Annual (12 Months)', controller.calculatePlanAmount('ANNUAL')),
                    const SizedBox(height: 16),

                    // Reference Number Input
                    Text(
                      'UTR / Reference Number ${isRefRequired ? '*' : '(Optional)'}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: controller.bankRefController,
                      decoration: InputDecoration(
                        hintText: 'Enter 12-digit UTR or Transaction ID',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Payment Proof Upload
                    Text(
                      'Payment Proof Screenshot ${isProofRequired ? '*' : '(Optional)'}',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 6),
                    if (controller.proofFile.value != null) ...[
                      Stack(
                        children: [
                          Container(
                            height: 140,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: Colors.grey[300]!),
                              image: DecorationImage(
                                image: FileImage(controller.proofFile.value!),
                                fit: BoxFit.cover,
                              ),
                            ),
                          ),
                          Positioned(
                            top: 6,
                            right: 6,
                            child: CircleAvatar(
                              radius: 16,
                              backgroundColor: Colors.black54,
                              child: IconButton(
                                icon: const Icon(Icons.close, size: 16, color: Colors.white),
                                onPressed: controller.removeProofImage,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => controller.pickProofImage(ImageSource.gallery),
                              icon: const Icon(Icons.photo_library),
                              label: const Text('Gallery'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () => controller.pickProofImage(ImageSource.camera),
                              icon: const Icon(Icons.camera_alt),
                              label: const Text('Camera'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 16),

                    // Remarks
                    const Text('Notes / Remarks (Optional)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: controller.bankNotesController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        hintText: 'Any extra payment notes for society treasurer',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                        contentPadding: const EdgeInsets.all(12),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Submit Button
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10b981),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: controller.isSubmitting.value ? null : controller.submitBankTransfer,
                        child: controller.isSubmitting.value
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Text(
                                'Submit ${AppConstants.formatCurrency(controller.calculatePlanAmount(controller.selectedPlan.value))} Payment for Approval',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                ],
              );
            });
          },
        );
      },
    );
  }

  Widget _planOption(String key, String title, double amount) {
    return Obx(() {
      final isSelected = controller.selectedPlan.value == key;
      return Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563eb).withOpacity(0.08) : Colors.white,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? const Color(0xFF2563eb) : Colors.grey[300]!,
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: () => controller.selectedPlan.value = key,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isSelected ? Icons.radio_button_checked : Icons.radio_button_off,
                      color: isSelected ? const Color(0xFF2563eb) : Colors.grey[400],
                      size: 20,
                    ),
                    const SizedBox(width: 10),
                    Text(title, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.w500)),
                  ],
                ),
                Text(
                  AppConstants.formatCurrency(amount),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: isSelected ? const Color(0xFF2563eb) : Colors.black87,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    });
  }

  Widget _bankDetailRow(String label, String value, {bool canCopy = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
          Row(
            children: [
              Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, fontFamily: 'monospace')),
              if (canCopy && value.isNotEmpty && value != 'Not configured') ...[
                const SizedBox(width: 4),
                InkWell(
                  onTap: () {
                    Clipboard.setData(ClipboardData(text: value));
                    Get.snackbar('Copied', '$label copied to clipboard',
                        snackPosition: SnackPosition.BOTTOM, duration: const Duration(seconds: 2));
                  },
                  child: const Padding(
                    padding: EdgeInsets.all(2.0),
                    child: Icon(Icons.copy, size: 14, color: Color(0xFF2563eb)),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
