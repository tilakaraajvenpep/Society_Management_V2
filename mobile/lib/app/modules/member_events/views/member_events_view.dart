import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/utils/constants.dart';
import '../../member_home/controllers/member_home_controller.dart';

class MemberEventsView extends StatelessWidget {
  const MemberEventsView({super.key});

  @override
  Widget build(BuildContext context) {
    final MemberHomeController controller = Get.find<MemberHomeController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Society Events', style: TextStyle(fontWeight: FontWeight.bold)),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: controller.fetchEvents,
            tooltip: 'Refresh Events',
          ),
        ],
      ),
      body: Obx(() {
        if (controller.isEventsLoading.value) {
          return const Center(child: CircularProgressIndicator());
        }

        if (controller.events.isEmpty) {
          return RefreshIndicator(
            onRefresh: controller.fetchEvents,
            child: ListView(
              children: [
                SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                Center(
                  child: Column(
                    children: [
                      Icon(Icons.event_busy, size: 60, color: Colors.grey[300]),
                      const SizedBox(height: 12),
                      const Text(
                        'No upcoming events scheduled',
                        style: TextStyle(color: Colors.grey, fontSize: 15, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Society community events and notices will appear here.',
                        style: TextStyle(color: Colors.grey[400], fontSize: 12),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: controller.fetchEvents,
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: controller.events.length,
            itemBuilder: (context, index) {
              final event = controller.events[index];
              return _buildEventCard(event);
            },
          ),
        );
      }),
    );
  }

  Widget _buildEventCard(Map event) {
    final title = event['title'] ?? 'Community Event';
    final desc = event['description'] ?? '';
    final location = event['location'];
    final eventDate = AppConstants.formatDateTime(event['eventDate']);
    final imageUrl = event['imageUrl'];

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: Colors.grey.withOpacity(0.2)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Event Banner Photo (Uploaded & Screened by Admin)
          if (imageUrl != null && imageUrl.toString().trim().isNotEmpty) ...[
            Container(
              height: 180,
              width: double.infinity,
              color: Colors.grey[100],
              child: Image.network(
                AppConstants.resolveImageUrl(imageUrl.toString()),
                fit: BoxFit.cover,
                loadingBuilder: (ctx, child, progress) {
                  if (progress == null) return child;
                  return const Center(child: CircularProgressIndicator(strokeWidth: 2));
                },
                errorBuilder: (_, __, ___) => Container(
                  height: 180,
                  color: const Color(0xFF2563eb).withOpacity(0.1),
                  child: const Center(
                    child: Icon(Icons.event, size: 48, color: Color(0xFF2563eb)),
                  ),
                ),
              ),
            ),
          ],

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Date & Time Pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563eb).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.calendar_today, size: 12, color: Color(0xFF2563eb)),
                      const SizedBox(width: 6),
                      Text(
                        eventDate,
                        style: const TextStyle(
                          color: Color(0xFF2563eb),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Title
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF0f172a),
                  ),
                ),

                // Location / Venue
                if (location != null && location.toString().trim().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined, size: 15, color: Colors.grey),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          location.toString(),
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey[700],
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],

                // Description
                if (desc.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(
                    desc,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[800],
                      height: 1.4,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
