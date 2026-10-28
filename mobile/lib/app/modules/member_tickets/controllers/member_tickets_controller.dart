import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../core/utils/api_client.dart';
import '../../member_home/controllers/member_home_controller.dart';

class MemberTicketsController extends GetxController {
  final ApiClient apiClient = Get.find<ApiClient>();
  final MemberHomeController homeCtrl = Get.find<MemberHomeController>();

  final isLoading = false.obs;
  final tickets = <dynamic>[].obs;
  final selectedFilter = 'ALL'.obs;

  // New ticket fields
  final subjectController = TextEditingController();
  final descController = TextEditingController();
  final selectedPriority = 'MEDIUM'.obs;
  final isSubmitting = false.obs;

  @override
  void onInit() {
    super.onInit();
    syncTickets();
  }

  void syncTickets() {
    tickets.value = List.from(homeCtrl.tickets);
  }

  Future<void> fetchTickets() async {
    isLoading.value = true;
    try {
      final response = await apiClient.dio.get('/tickets');
      if (response.statusCode == 200 && response.data != null) {
        tickets.value = List.from(response.data);
        homeCtrl.tickets.value = List.from(response.data);
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to load tickets: $e', snackPosition: SnackPosition.BOTTOM);
    } finally {
      isLoading.value = false;
    }
  }

  List<dynamic> get filteredTickets {
    if (selectedFilter.value == 'ALL') return tickets;
    return tickets.where((t) => t['status'] == selectedFilter.value).toList();
  }

  Future<void> createTicket() async {
    final subject = subjectController.text.trim();
    final description = descController.text.trim();

    if (subject.isEmpty || description.isEmpty) {
      Get.snackbar('Required Fields', 'Please enter both subject and description',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.amber[800], colorText: Colors.white);
      return;
    }

    isSubmitting.value = true;
    try {
      final response = await apiClient.dio.post('/tickets', data: {
        'subject': subject,
        'description': description,
        'priority': selectedPriority.value,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        Get.back(); // Close dialog/sheet
        subjectController.clear();
        descController.clear();
        selectedPriority.value = 'MEDIUM';

        Get.snackbar(
          'Ticket Created',
          'Your support ticket has been submitted to society management.',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: const Color(0xFF10b981),
          colorText: Colors.white,
        );

        await fetchTickets();
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to create ticket: $e',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isSubmitting.value = false;
    }
  }

  @override
  void onClose() {
    subjectController.dispose();
    descController.dispose();
    super.onClose();
  }
}
