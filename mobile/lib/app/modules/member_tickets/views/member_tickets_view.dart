import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/utils/constants.dart';
import '../controllers/member_tickets_controller.dart';

class MemberTicketsView extends GetView<MemberTicketsController> {
  const MemberTicketsView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Helpdesk & Complaints', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: controller.fetchTickets,
            tooltip: 'Refresh',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openNewTicketSheet(context),
        backgroundColor: const Color(0xFF2563eb),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Complaint', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Obx(() {
        if (controller.isLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        final tickets = controller.filteredTickets;

        return RefreshIndicator(
          onRefresh: controller.fetchTickets,
          child: Column(
            children: [
              // Filter chips bar
              Container(
                height: 50,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _filterChip('ALL', 'All'),
                    const SizedBox(width: 8),
                    _filterChip('OPEN', 'Open'),
                    const SizedBox(width: 8),
                    _filterChip('IN_PROGRESS', 'In Progress'),
                    const SizedBox(width: 8),
                    _filterChip('RESOLVED', 'Resolved'),
                    const SizedBox(width: 8),
                    _filterChip('CLOSED', 'Closed'),
                  ],
                ),
              ),

              // Tickets List
              Expanded(
                child: tickets.isEmpty
                    ? _buildEmptyState()
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: tickets.length,
                        itemBuilder: (context, index) {
                          final t = tickets[index];
                          return _buildTicketCard(t, context);
                        },
                      ),
              ),
            ],
          ),
        );
      }),
    );
  }

  Widget _filterChip(String key, String label) {
    return Obx(() {
      final isSelected = controller.selectedFilter.value == key;
      return FilterChip(
        label: Text(label),
        selected: isSelected,
        selectedColor: const Color(0xFF2563eb).withOpacity(0.15),
        checkmarkColor: const Color(0xFF2563eb),
        labelStyle: TextStyle(
          color: isSelected ? const Color(0xFF2563eb) : Colors.grey[700],
          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
          fontSize: 12,
        ),
        onSelected: (_) => controller.selectedFilter.value = key,
      );
    });
  }

  Widget _buildTicketCard(Map ticket, BuildContext context) {
    final subject = ticket['subject'] ?? 'Untitled Complaint';
    final desc = ticket['description'] ?? '';
    final status = ticket['status'] ?? 'OPEN';
    final priority = ticket['priority'] ?? 'MEDIUM';
    final date = AppConstants.formatDate(ticket['createdAt']);

    Color statusColor;
    String statusText;

    switch (status) {
      case 'IN_PROGRESS':
        statusColor = const Color(0xFFf59e0b);
        statusText = 'In Progress';
        break;
      case 'RESOLVED':
        statusColor = const Color(0xFF10b981);
        statusText = 'Resolved';
        break;
      case 'CLOSED':
        statusColor = Colors.grey;
        statusText = 'Closed';
        break;
      case 'OPEN':
      default:
        statusColor = const Color(0xFFef4444);
        statusText = 'Open';
    }

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _openTicketDetailDialog(ticket),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.grey[100],
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'Priority: $priority',
                      style: TextStyle(color: Colors.grey[700], fontSize: 11, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                subject,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF0f172a)),
              ),
              const SizedBox(height: 6),
              Text(
                desc,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.grey[700], fontSize: 13, height: 1.3),
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Raised on: $date', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                  const Text('View details →', style: TextStyle(color: Color(0xFF2563eb), fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.support_agent, size: 60, color: Colors.grey[300]),
          const SizedBox(height: 12),
          const Text('No tickets found', style: TextStyle(color: Colors.grey, fontSize: 15, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('Tap "+ New Complaint" below to submit an issue.', style: TextStyle(color: Colors.grey[400], fontSize: 12)),
        ],
      ),
    );
  }

  void _openNewTicketSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Raise Support Ticket', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),

                const Text('Subject *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 6),
                TextField(
                  controller: controller.subjectController,
                  decoration: const InputDecoration(hintText: 'e.g. Water leakage in bathroom pipe'),
                ),
                const SizedBox(height: 16),

                const Text('Priority', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 6),
                Obx(() => DropdownButtonFormField<String>(
                      value: controller.selectedPriority.value,
                      decoration: const InputDecoration(),
                      items: const [
                        DropdownMenuItem(value: 'LOW', child: Text('Low Priority')),
                        DropdownMenuItem(value: 'MEDIUM', child: Text('Medium Priority')),
                        DropdownMenuItem(value: 'HIGH', child: Text('High Priority')),
                        DropdownMenuItem(value: 'URGENT', child: Text('Urgent Priority')),
                      ],
                      onChanged: (val) {
                        if (val != null) controller.selectedPriority.value = val;
                      },
                    )),
                const SizedBox(height: 16),

                const Text('Detailed Description *', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 6),
                TextField(
                  controller: controller.descController,
                  maxLines: 4,
                  decoration: const InputDecoration(hintText: 'Provide details on the issue, location, and preferred inspection time...'),
                ),
                const SizedBox(height: 24),

                Obx(() => SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: controller.isSubmitting.value ? null : controller.createTicket,
                        child: controller.isSubmitting.value
                            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Text('Submit Complaint', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ),
                    )),
              ],
            ),
          ),
        );
      },
    );
  }

  void _openTicketDetailDialog(Map ticket) {
    Get.dialog(
      Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Complaint Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  IconButton(icon: const Icon(Icons.close), onPressed: () => Get.back()),
                ],
              ),
              const Divider(),
              Text(ticket['subject'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text('Status: ${ticket['status'] ?? 'OPEN'}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                  const SizedBox(width: 12),
                  Text('Priority: ${ticket['priority'] ?? 'MEDIUM'}', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                ],
              ),
              const SizedBox(height: 14),
              const Text('Description:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 4),
              Text(ticket['description'] ?? '', style: TextStyle(color: Colors.grey[800], fontSize: 14, height: 1.4)),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
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
}
