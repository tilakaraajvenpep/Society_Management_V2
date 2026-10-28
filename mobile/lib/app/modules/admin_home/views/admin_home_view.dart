import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/admin_home_controller.dart';

class AdminHomeView extends GetView<AdminHomeController> {
  const AdminHomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: controller.logout,
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isMaintenanceActive.value) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.1),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.construction_rounded, size: 40, color: Colors.redAccent),
                  ),
                  const SizedBox(height: 20),
                  const Text('System Under Maintenance', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  Text(
                    controller.maintenanceMessage.value.isNotEmpty
                        ? controller.maintenanceMessage.value
                        : 'Society admin portal is currently undergoing scheduled maintenance.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: controller.fetchSummary,
                    child: const Text('Check Again'),
                  ),
                ],
              ),
            ),
          );
        }

        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        final summary = controller.summaryData;
        if (summary.isEmpty) {
          return const Center(child: Text('No summary data found'));
        }

        final kpiCards = _buildKPICards(summary);
        final quickActions = _buildQuickActionWidgets();

        return RefreshIndicator(
          onRefresh: controller.fetchSummary,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20.0),
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (kpiCards.isNotEmpty) ...[
                  const Text(
                    'Overview',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                    childAspectRatio: 1.5,
                    children: kpiCards,
                  ),
                  const SizedBox(height: 24),
                ],
                if (quickActions.isNotEmpty) ...[
                  const Text(
                    'Quick Actions',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  Row(children: quickActions),
                  const SizedBox(height: 24),
                ],
                if (controller.isMenuEnabled('payments') || controller.isMenuEnabled('expenses')) ...[
                  const Text(
                    'Payment Handover Status',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  _buildHandoverStatus(summary),
                ],
              ],
            ),
          ),
        );
      }),
    );
  }

  List<Widget> _buildKPICards(Map summary) {
    final outstanding = summary['totals']?['outstanding']?.toDouble() ?? 0.0;
    final cashInHand = summary['totals']?['cashInHand']?.toDouble() ?? 0.0;
    final monthIncome = summary['monthly']?['income']?['current']?.toDouble() ?? 0.0;

    final List<Widget> cards = [];
    if (controller.isMenuEnabled('payments')) {
      cards.add(_buildKPICard('Outstanding', '₹${outstanding.toInt()}', Colors.orange));
    }
    if (controller.isMenuEnabled('payments') || controller.isMenuEnabled('expenses')) {
      cards.add(_buildKPICard('Cash in Hand', '₹${cashInHand.toInt()}', Colors.green));
    }
    if (controller.isMenuEnabled('payments')) {
      cards.add(_buildKPICard('Monthly Income', '₹${monthIncome.toInt()}', Colors.blue));
    }
    if (controller.isMenuEnabled('members')) {
      cards.add(_buildKPICard('Active Members', summary['totals']?['memberCount']?.toString() ?? '0', Colors.purple));
    }
    return cards;
  }

  Widget _buildKPICard(String title, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[100]!),
        boxShadow: [
          BoxShadow(color: Colors.grey.withOpacity(0.05), blurRadius: 4, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(title, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildQuickActionWidgets() {
    final List<Widget> items = [];
    if (controller.isMenuEnabled('payments')) {
      items.add(_buildActionItem(Icons.add_card, 'Collect', () => Get.toNamed('/admin-collect-payment')));
    }
    if (controller.isMenuEnabled('members')) {
      if (items.isNotEmpty) items.add(const SizedBox(width: 16));
      items.add(_buildActionItem(Icons.people, 'Members', () => Get.toNamed('/admin-members')));
    }
    if (controller.isMenuEnabled('expenses')) {
      if (items.isNotEmpty) items.add(const SizedBox(width: 16));
      items.add(_buildActionItem(Icons.account_balance_wallet, 'Expenses', () {}));
    }
    return items;
  }

  Widget _buildActionItem(IconData icon, String label, VoidCallback onTap) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: const Color(0xFF2563eb).withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            children: [
              Icon(icon, color: const Color(0xFF2563eb)),
              const SizedBox(height: 8),
              Text(
                label,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF2563eb)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHandoverStatus(Map summary) {
    final handovers = summary['handoverStatus'] as List?;
    if (handovers == null || handovers.isEmpty) {
      return const Center(child: Text('No pending handovers'));
    }

    return Column(
      children: handovers.map((h) {
        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey[100]!),
          ),
          child: ListTile(
            title: Text(h['handoverStatus'].toString().replaceAll('_', ' ')),
            trailing: Text(
              '₹${h['_sum']?['amount']?.toInt() ?? 0}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        );
      }).toList(),
    );
  }
}
