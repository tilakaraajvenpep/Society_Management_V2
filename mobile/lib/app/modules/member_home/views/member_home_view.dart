import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/utils/constants.dart';
import '../controllers/member_home_controller.dart';
import '../../member_payments/views/member_payments_view.dart';
import '../../member_receipts/views/member_receipts_view.dart';
import '../../member_events/views/member_events_view.dart';
import '../../member_tickets/views/member_tickets_view.dart';

class MemberHomeView extends GetView<MemberHomeController> {
  const MemberHomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      // 1. Check Mobile Maintenance Mode
      if (controller.isMaintenanceActive.value) {
        return _buildMaintenanceScreen(context);
      }

      // 2. Check Force App Update Required
      if (controller.isForceUpdateActive.value) {
        return _buildForceUpdateScreen(context);
      }

      final themeColor = controller.themeColor.value;

      // 3. Build dynamic navigation tabs based on tenant permissions
      final List<Widget> tabViews = [];
      final List<NavigationDestination> tabDestinations = [];

      // Home / Dashboard
      if (controller.isMenuEnabled('dashboard')) {
        tabViews.add(const _MemberDashboardTab());
        tabDestinations.add(NavigationDestination(
          icon: const Icon(Icons.dashboard_outlined),
          selectedIcon: Icon(Icons.dashboard, color: themeColor),
          label: 'home'.tr,
        ));
      }

      // Payments
      if (controller.isMenuEnabled('payments')) {
        tabViews.add(const MemberPaymentsView());
        tabDestinations.add(NavigationDestination(
          icon: const Icon(Icons.payment_outlined),
          selectedIcon: Icon(Icons.payment, color: themeColor),
          label: 'payments'.tr,
        ));
      }

      // Receipts
      if (controller.isMenuEnabled('receipts')) {
        tabViews.add(const MemberReceiptsView());
        tabDestinations.add(NavigationDestination(
          icon: const Icon(Icons.receipt_long_outlined),
          selectedIcon: Icon(Icons.receipt_long, color: themeColor),
          label: 'receipts'.tr,
        ));
      }

      // Events
      if (controller.isMenuEnabled('events')) {
        tabViews.add(const MemberEventsView());
        tabDestinations.add(NavigationDestination(
          icon: const Icon(Icons.event_outlined),
          selectedIcon: Icon(Icons.event, color: themeColor),
          label: 'events'.tr,
        ));
      }

      // Helpdesk
      if (controller.isMenuEnabled('helpdesk')) {
        tabViews.add(const MemberTicketsView());
        tabDestinations.add(NavigationDestination(
          icon: const Icon(Icons.support_agent_outlined),
          selectedIcon: Icon(Icons.support_agent, color: themeColor),
          label: 'helpdesk'.tr,
        ));
      }

      // Profile (always accessible or when enabled)
      if (controller.isMenuEnabled('profile')) {
        tabViews.add(const _MemberProfileTab());
        tabDestinations.add(NavigationDestination(
          icon: const Icon(Icons.person_outline),
          selectedIcon: Icon(Icons.person, color: themeColor),
          label: 'profile'.tr,
        ));
      }

      // Fallback if no tabs enabled
      if (tabViews.isEmpty) {
        tabViews.add(const _MemberDashboardTab());
        tabDestinations.add(NavigationDestination(
          icon: const Icon(Icons.home),
          label: 'home'.tr,
        ));
      }

      final activeIdx = controller.currentTab.value.clamp(0, tabViews.length - 1);

      return Scaffold(
        body: IndexedStack(
          index: activeIdx,
          children: tabViews,
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: activeIdx,
          onDestinationSelected: (idx) => controller.changeTab(idx),
          backgroundColor: Colors.white,
          elevation: 8,
          indicatorColor: themeColor.withOpacity(0.14),
          destinations: tabDestinations,
        ),
      );
    });
  }

  Widget _buildMaintenanceScreen(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.construction_rounded, size: 48, color: Colors.redAccent),
                ),
                const SizedBox(height: 24),
                Text(
                  'maintenance_title'.tr,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0f172a)),
                ),
                const SizedBox(height: 12),
                Text(
                  controller.maintenanceMessage.value.isNotEmpty
                      ? controller.maintenanceMessage.value
                      : 'maintenance_msg'.tr,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.5),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563eb),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: controller.refreshAll,
                    icon: const Icon(Icons.refresh, color: Colors.white),
                    label: const Text('Check Status Again', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton.icon(
                  onPressed: controller.logout,
                  icon: const Icon(Icons.logout, color: Colors.redAccent, size: 18),
                  label: const Text('Logout', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildForceUpdateScreen(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFf8fafc),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 90,
                  height: 90,
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563eb).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.system_update_rounded, size: 48, color: Color(0xFF2563eb)),
                ),
                const SizedBox(height: 24),
                Text(
                  'force_update_title'.tr,
                  style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0f172a)),
                ),
                const SizedBox(height: 12),
                Text(
                  controller.updateMessage.value.isNotEmpty
                      ? controller.updateMessage.value
                      : 'force_update_msg'.tr,
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 14, color: Colors.grey[700], height: 1.5),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10b981),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: controller.openStoreUrl,
                    icon: const Icon(Icons.download_rounded, color: Colors.white),
                    label: Text('update_now'.tr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MemberDashboardTab extends GetView<MemberHomeController> {
  const _MemberDashboardTab();

  void _showLanguageDialog(BuildContext context) {
    final languages = [
      {'code': 'en', 'country': 'US', 'name': 'English', 'native': 'English'},
      {'code': 'hi', 'country': 'IN', 'name': 'Hindi', 'native': 'हिन्दी'},
      {'code': 'ta', 'country': 'IN', 'name': 'Tamil', 'native': 'தமிழ்'},
      {'code': 'te', 'country': 'IN', 'name': 'Telugu', 'native': 'తెలుగు'},
      {'code': 'kn', 'country': 'IN', 'name': 'Kannada', 'native': 'ಕನ್ನಡ'},
      {'code': 'mr', 'country': 'IN', 'name': 'Marathi', 'native': 'मराठी'},
    ];

    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: [
            Icon(Icons.translate, color: controller.themeColor.value),
            const SizedBox(width: 8),
            Text('change_language'.tr, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: languages.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, idx) {
              final lang = languages[idx];
              final isCurrent = controller.selectedLocale.value == '${lang['code']}_${lang['country']}';
              return ListTile(
                title: Text(lang['name']!, style: TextStyle(fontWeight: isCurrent ? FontWeight.bold : FontWeight.w500)),
                subtitle: Text(lang['native']!, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                trailing: isCurrent ? Icon(Icons.check_circle, color: controller.themeColor.value) : null,
                onTap: () {
                  Get.back();
                  controller.changeLanguage(lang['code']!, lang['country']!);
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(onPressed: () => Get.back(), child: Text('cancel'.tr)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = controller.themeColor.value;

    return Scaffold(
      appBar: AppBar(
        title: Obx(() {
          final tenant = controller.memberData['tenant'] ?? {};
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                tenant['name'] ?? 'Society Member Portal',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const Text(
                'SocietyArena Resident',
                style: TextStyle(fontSize: 11, color: Colors.grey),
              ),
            ],
          );
        }),
        actions: [
          IconButton(
            icon: const Icon(Icons.translate),
            tooltip: 'change_language'.tr,
            onPressed: () => _showLanguageDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            tooltip: 'profile'.tr,
            onPressed: () => controller.navigateToMenu('profile'),
          ),
          IconButton(
            icon: const Icon(Icons.settings_ethernet),
            tooltip: 'Server Connection',
            onPressed: controller.showServerConfigDialog,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFFef4444)),
            tooltip: 'logout'.tr,
            onPressed: controller.logout,
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        final member = controller.memberData;
        if (member.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('No profile data found', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 12),
                ElevatedButton(onPressed: controller.refreshAll, child: const Text('Retry')),
              ],
            ),
          );
        }

        final dues = (member['outstandingDues'] ?? 0.0).toDouble();
        final paidUntil = member['paidUntil'] != null ? AppConstants.formatDate(member['paidUntil']) : 'Not set';
        final recentPayments = member['payments'] as List<dynamic>? ?? [];

        return RefreshIndicator(
          onRefresh: controller.refreshAll,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Welcome Header
              _buildHeader(member, themeColor),
              const SizedBox(height: 18),

              // Dues Card with Monthly Breakdown Summary
              _buildDuesCard(member, dues, paidUntil, themeColor),
              const SizedBox(height: 24),

              // Quick Actions
              if (controller.isMenuEnabled('payments') ||
                  controller.isMenuEnabled('receipts') ||
                  controller.isMenuEnabled('events') ||
                  controller.isMenuEnabled('helpdesk')) ...[
                Text('quick_actions'.tr, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0f172a))),
                const SizedBox(height: 12),
                _buildQuickActionsGrid(themeColor),
                const SizedBox(height: 24),
              ],

              // Society Announcements / Notice Board
              if (controller.announcements.isNotEmpty) ...[
                const Text('Notice Board & Announcements', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0f172a))),
                const SizedBox(height: 12),
                _buildAnnouncementsCard(),
                const SizedBox(height: 24),
              ],

              // Recent Payments
              if (controller.isMenuEnabled('payments') || controller.isMenuEnabled('receipts')) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('recent_payments'.tr, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Color(0xFF0f172a))),
                    TextButton(
                      onPressed: () => controller.navigateToMenu('payments'),
                      child: Text('view_all'.tr, style: const TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                if (recentPayments.isEmpty)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.grey[200]!),
                    ),
                    alignment: Alignment.center,
                    child: const Text('No recent payments recorded', style: TextStyle(color: Colors.grey)),
                  )
                else
                  ...recentPayments.take(3).map((p) => _buildRecentPaymentItem(p, themeColor)).toList(),
              ],
            ],
          ),
        );
      }),
    );
  }

  Widget _buildHeader(Map member, Color themeColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome back,', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
            Text(
              member['name'] ?? 'Member',
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF0f172a)),
            ),
          ],
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: themeColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: themeColor.withOpacity(0.2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.home_outlined, size: 16, color: themeColor),
              const SizedBox(width: 4),
              Text(
                '${'flat'.tr} ${member['flatNo'] ?? 'N/A'}',
                style: TextStyle(color: themeColor, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDuesCard(Map member, double dues, String paidUntil, Color themeColor) {
    // Extract dues summary from backend profile
    final summary = member['duesSummary'] as Map<dynamic, dynamic>? ?? {};
    final int paidMonths = summary['paidMonthsCount'] ?? 0;
    final int dueMonths = summary['dueMonthsCount'] ?? (dues > 0 ? 10 : 0);
    final int totalMonths = paidMonths + dueMonths > 0 ? paidMonths + dueMonths : 12;
    final num totalPaidAmount = summary['totalPaidAmount'] ?? 0;
    final double progress = totalMonths > 0 ? (paidMonths / totalMonths).clamp(0.0, 1.0) : 0.0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            themeColor.withOpacity(0.95),
            themeColor,
            const Color(0xFF1e293b),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: themeColor.withOpacity(0.35),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('outstanding_dues'.tr, style: const TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text('Covered until: $paidUntil', style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w500)),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            AppConstants.formatCurrency(dues),
            style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900),
          ),

          const SizedBox(height: 14),

          // Monthly Dues vs Paid Status Pill & Progress
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.25),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: Colors.white.withOpacity(0.15)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.check_circle, size: 14, color: Color(0xFF34d399)),
                        const SizedBox(width: 5),
                        Text(
                          'Paid: $paidMonths of $totalMonths ${'months'.tr} (${AppConstants.formatCurrency(totalPaidAmount)})',
                          style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                    Text(
                      '$dueMonths Due',
                      style: const TextStyle(color: Color(0xFFfca5a5), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 5,
                    backgroundColor: Colors.white.withOpacity(0.2),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF34d399)),
                  ),
                ),
              ],
            ),
          ),

          if (controller.isMenuEnabled('payments')) ...[
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10b981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 2,
                    ),
                    onPressed: () => controller.navigateToMenu('payments'),
                    icon: const Icon(Icons.arrow_forward, size: 18),
                    label: Text('pay_now'.tr, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 10),
                OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.white,
                    side: const BorderSide(color: Colors.white54),
                    padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => controller.navigateToMenu('payments'),
                  child: const Text('Ledger', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildQuickActionsGrid(Color themeColor) {
    final List<Widget> actions = [];
    if (controller.isMenuEnabled('payments')) {
      actions.add(_actionCard(
        icon: Icons.payment,
        color: themeColor,
        title: 'payments'.tr,
        subtitle: 'Bank transfer & QR',
        onTap: () => controller.navigateToMenu('payments'),
      ));
    }
    if (controller.isMenuEnabled('receipts')) {
      actions.add(_actionCard(
        icon: Icons.receipt_long,
        color: const Color(0xFF10b981),
        title: 'receipts'.tr,
        subtitle: 'Official records',
        onTap: () => controller.navigateToMenu('receipts'),
      ));
    }
    if (controller.isMenuEnabled('events')) {
      actions.add(_actionCard(
        icon: Icons.event,
        color: const Color(0xFF8b5cf6),
        title: 'events'.tr,
        subtitle: 'Community gatherings',
        onTap: () => controller.navigateToMenu('events'),
      ));
    }
    if (controller.isMenuEnabled('helpdesk')) {
      actions.add(_actionCard(
        icon: Icons.support_agent,
        color: const Color(0xFFf59e0b),
        title: 'helpdesk'.tr,
        subtitle: 'Complaints & queries',
        onTap: () => controller.navigateToMenu('helpdesk'),
      ));
    }

    if (actions.isEmpty) return const SizedBox.shrink();

    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.6,
      children: actions,
    );
  }

  Widget _actionCard({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              Text(subtitle, style: TextStyle(color: Colors.grey[500], fontSize: 11)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAnnouncementsCard() {
    return Column(
      children: controller.announcements.take(2).map((a) {
        return Card(
          elevation: 0,
          margin: const EdgeInsets.only(bottom: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(color: Colors.grey.withOpacity(0.2)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF7c3aed).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.campaign, color: Color(0xFF7c3aed), size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(a['title'] ?? 'Notice', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 4),
                      Text(a['message'] ?? '', style: TextStyle(color: Colors.grey[700], fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildRecentPaymentItem(Map p, Color themeColor) {
    final status = p['status']?.toString().toUpperCase() ?? 'PAID';
    final amount = p['amount'] ?? 0;
    final date = AppConstants.formatDate(p['paymentDate']);

    Color color;
    if (status == 'PAID') {
      color = const Color(0xFF10b981);
    } else if (status == 'PENDING') {
      color = const Color(0xFFf59e0b);
    } else {
      color = const Color(0xFFef4444);
    }

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withOpacity(0.12),
          child: Icon(Icons.receipt, color: color, size: 20),
        ),
        title: Text(p['periodLabel'] ?? 'Maintenance', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text('$date • Status: $status', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        trailing: Text(
          AppConstants.formatCurrency(amount),
          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: themeColor),
        ),
      ),
    );
  }
}

class _MemberProfileTab extends GetView<MemberHomeController> {
  const _MemberProfileTab();

  void _showEditProfileDialog(BuildContext context) {
    final member = controller.memberData;
    final nameController = TextEditingController(text: member['name'] ?? '');
    final mobileController = TextEditingController(text: member['mobile'] ?? '');
    final emailController = TextEditingController(text: member['email'] ?? '');
    final passwordController = TextEditingController();

    Get.bottomSheet(
      Container(
        padding: const EdgeInsets.all(22),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('update_profile'.tr, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  IconButton(onPressed: () => Get.back(), icon: const Icon(Icons.close)),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: nameController,
                decoration: InputDecoration(
                  labelText: 'full_name'.tr,
                  prefixIcon: const Icon(Icons.person_outline),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: mobileController,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: 'mobile_number'.tr,
                  prefixIcon: const Icon(Icons.phone_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  hintText: '10 digit mobile number',
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: InputDecoration(
                  labelText: 'email_address'.tr,
                  prefixIcon: const Icon(Icons.email_outlined),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: passwordController,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'new_password'.tr,
                  prefixIcon: const Icon(Icons.lock_outline),
                  helperText: 'new_password_hint'.tr,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: controller.themeColor.value,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () async {
                    if (nameController.text.trim().isEmpty) {
                      Get.snackbar('Required', 'Name cannot be empty', snackPosition: SnackPosition.BOTTOM);
                      return;
                    }
                    if (mobileController.text.trim().length != 10) {
                      Get.snackbar('Validation', 'Mobile number must be 10 digits', snackPosition: SnackPosition.BOTTOM);
                      return;
                    }
                    Get.back();
                    await controller.updateProfile(
                      name: nameController.text.trim(),
                      mobile: mobileController.text.trim(),
                      email: emailController.text.trim(),
                      password: passwordController.text.trim().isNotEmpty ? passwordController.text.trim() : null,
                    );
                  },
                  child: Text('save_changes'.tr, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
      isScrollControlled: true,
    );
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = controller.themeColor.value;

    return Scaffold(
      appBar: AppBar(
        title: Text('profile'.tr, style: const TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            tooltip: 'update_profile'.tr,
            onPressed: () => _showEditProfileDialog(context),
          ),
        ],
      ),
      body: Obx(() {
        final member = controller.memberData;
        final tenant = member['tenant'] as Map<dynamic, dynamic>? ?? {};

        return ListView(
          padding: const EdgeInsets.all(18),
          children: [
            // User Avatar & Name Card
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.withOpacity(0.2)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 38,
                      backgroundColor: themeColor.withOpacity(0.12),
                      child: Text(
                        (member['name'] ?? 'M').toString().substring(0, 1).toUpperCase(),
                        style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: themeColor),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      member['name'] ?? 'Member',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      member['email'] ?? '',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      member['mobile'] ?? '',
                      style: TextStyle(color: Colors.grey[700], fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 14),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: themeColor,
                        side: BorderSide(color: themeColor),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                      onPressed: () => _showEditProfileDialog(context),
                      icon: const Icon(Icons.edit, size: 16),
                      label: Text('update_profile'.tr),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 18),

            // Flat & Residence Information Card
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.withOpacity(0.2)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Flat & Society Information', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                    const SizedBox(height: 12),
                    _profileInfoRow(Icons.apartment, 'Society Name', tenant['name'] ?? 'Society'),
                    const Divider(height: 18),
                    _profileInfoRow(Icons.meeting_room, 'Flat / Unit Number', 'Flat ${member['flatNo'] ?? 'N/A'}'),
                    const Divider(height: 18),
                    _profileInfoRow(Icons.bed, 'BHK Unit Configuration', member['bhk'] ?? 'COMMON'),
                    const Divider(height: 18),
                    _profileInfoRow(Icons.home_work, 'Residence Type', member['residenceType'] ?? 'RESIDENTIAL'),
                    const Divider(height: 18),
                    _profileInfoRow(Icons.calendar_today, 'Registration Financial Year', member['registrationYear'] ?? 'Current FY'),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 18),

            // App Settings Tile
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: Colors.grey.withOpacity(0.2)),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: Icon(Icons.translate, color: themeColor),
                    title: Text('change_language'.tr, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text('Current: ${controller.selectedLocale.value}', style: const TextStyle(fontSize: 12)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () {
                      const _MemberDashboardTab()._showLanguageDialog(context);
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.settings_ethernet, color: Color(0xFF64748b)),
                    title: const Text('Server Connection', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(AppConstants.baseUrl, style: const TextStyle(fontSize: 11)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: controller.showServerConfigDialog,
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.info_outline, color: Color(0xFF64748b)),
                    title: const Text('App Version', style: TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: const Text('v${AppConstants.appVersion}', style: TextStyle(fontSize: 12)),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.logout, color: Color(0xFFef4444)),
                    title: Text('logout'.tr, style: const TextStyle(fontWeight: FontWeight.w600, color: Color(0xFFef4444))),
                    onTap: controller.logout,
                  ),
                ],
              ),
            ),
          ],
        );
      }),
    );
  }

  Widget _profileInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: Colors.grey[600]),
        const SizedBox(width: 12),
        Expanded(
          child: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        ),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0f172a))),
      ],
    );
  }
}
