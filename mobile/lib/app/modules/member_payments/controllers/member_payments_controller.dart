import 'dart:io';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:image_picker/image_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/utils/api_client.dart';
import '../../../core/utils/constants.dart';
import '../../member_home/controllers/member_home_controller.dart';

class MemberPaymentsController extends GetxController {
  final ApiClient apiClient = Get.find<ApiClient>();
  final MemberHomeController homeController = Get.find<MemberHomeController>();

  final isLoading = false.obs;
  final payments = <dynamic>[].obs;

  // View state: 0 = Monthly Due vs Paid Breakdown, 1 = Payment Submissions & History
  final selectedViewTab = 0.obs;

  // Monthly breakdown ledger & dues summary
  final monthlyLedger = <Map<String, dynamic>>[].obs;
  final duesSummary = <String, dynamic>{}.obs;
  final ledgerFilter = 'ALL'.obs; // 'ALL' | 'DUE' | 'PAID'

  // Pay Maintenance Sheet state
  final paymentMethodTab = 1.obs; // 0 = Online, 1 = Bank Transfer & QR
  final selectedPlan = 'MONTHLY'.obs;
  final bankRefController = TextEditingController();
  final bankNotesController = TextEditingController();
  final proofFile = Rx<File?>(null);
  final isSubmitting = false.obs;
  final imagePicker = ImagePicker();

  @override
  void onInit() {
    super.onInit();
    syncPaymentsFromHome();
    ever(homeController.memberData, (_) => syncPaymentsFromHome());
  }

  void syncPaymentsFromHome() {
    final member = homeController.memberData;
    if (member.isEmpty) return;

    if (member['payments'] != null) {
      payments.value = List.from(member['payments']);
    }

    if (member['monthlyLedger'] != null && (member['monthlyLedger'] as List).isNotEmpty) {
      monthlyLedger.value = List<Map<String, dynamic>>.from(
        (member['monthlyLedger'] as List).map((item) => Map<String, dynamic>.from(item)),
      );
    } else {
      _generateFallbackLedger(member);
    }

    if (member['duesSummary'] != null) {
      duesSummary.value = Map<String, dynamic>.from(member['duesSummary']);
    }
  }

  void _generateFallbackLedger(Map<dynamic, dynamic> member) {
    final paymentsList = member['payments'] as List<dynamic>? ?? [];
    final dues = (member['outstandingDues'] ?? 0.0).toDouble();
    final paidUntilStr = member['paidUntil']?.toString();
    final DateTime? paidUntil = paidUntilStr != null ? DateTime.tryParse(paidUntilStr) : null;

    final now = DateTime.now();
    final currentYear = now.year;
    // FY April to March
    final startYear = now.month >= 4 ? currentYear : currentYear - 1;
    final monthNames = [
      'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'January', 'February', 'March'
    ];

    final monthlyRate = dues > 0 ? (dues / 12).round() : 167;
    final List<Map<String, dynamic>> list = [];

    for (int i = 0; i < 12; i++) {
      final calYear = i < 9 ? startYear : startYear + 1;
      final calMonth = (3 + i) % 12 + 1; // 1-indexed month
      final mStart = DateTime(calYear, calMonth, 1);
      final mEnd = DateTime(calYear, calMonth + 1, 0, 23, 59, 59);

      // Check payments
      dynamic coveredPayment;
      for (final p in paymentsList) {
        if (p['status'] == 'PAID' && p['coverageStartDate'] != null && p['coverageEndDate'] != null) {
          final cStart = DateTime.tryParse(p['coverageStartDate'].toString());
          final cEnd = DateTime.tryParse(p['coverageEndDate'].toString());
          if (cStart != null && cEnd != null && cStart.isBefore(mEnd) && cEnd.isAfter(mStart)) {
            coveredPayment = p;
            break;
          }
        }
      }

      final isPaid = coveredPayment != null || (paidUntil != null && paidUntil.isAfter(mStart));
      final isOverdue = !isPaid && mEnd.isBefore(now);

      list.add({
        'monthIndex': i + 1,
        'monthName': monthNames[i],
        'year': calYear,
        'label': '${monthNames[i]} $calYear',
        'status': isPaid ? 'PAID' : 'DUE',
        'isOverdue': isOverdue,
        'amount': isPaid && coveredPayment != null ? (coveredPayment['amount'] ?? monthlyRate) : monthlyRate,
        'receiptNumber': coveredPayment != null ? coveredPayment['receiptNumber'] : null,
        'paymentId': coveredPayment != null ? coveredPayment['id'] : null,
        'paymentDate': coveredPayment != null ? coveredPayment['paymentDate'] : null,
        'paymentMode': coveredPayment != null ? coveredPayment['mode'] : null,
      });
    }

    monthlyLedger.value = list;
  }

  Future<void> fetchPayments() async {
    isLoading.value = true;
    try {
      await homeController.fetchProfile();
      syncPaymentsFromHome();
    } finally {
      isLoading.value = false;
    }
  }

  double calculatePlanAmount(String plan) {
    final tenant = homeController.memberData['tenant'] ?? {};
    final monthly = (tenant['maintenanceAmount'] ?? 0.0).toDouble();
    final quarterly = (tenant['quarterlyAmount'] ?? (monthly * 3)).toDouble();
    final halfYearly = (tenant['halfYearlyAmount'] ?? (monthly * 6)).toDouble();
    final annual = (tenant['annualAmount'] ?? (monthly * 12)).toDouble();

    switch (plan) {
      case 'QUARTERLY':
        return quarterly > 0 ? quarterly : monthly * 3;
      case 'HALF_YEARLY':
        return halfYearly > 0 ? halfYearly : monthly * 6;
      case 'ANNUAL':
        return annual > 0 ? annual : monthly * 12;
      case 'MONTHLY':
      default:
        return monthly > 0 ? monthly : 167.0;
    }
  }

  Future<void> downloadReceipt(dynamic paymentId) async {
    if (paymentId == null || paymentId.toString().isEmpty) {
      Get.snackbar('Error', 'Invalid receipt reference',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
      return;
    }

    try {
      final token = await apiClient.storage.read(key: 'jwt_token') ?? '';
      final url = '${AppConstants.baseOrigin}/api/payments/$paymentId/receipt-html?token=$token&autoPrint=true';
      final uri = Uri.parse(url);

      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched) {
        Get.snackbar(
          'Download Receipt',
          'Could not open browser to download receipt. URL: $url',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.amber[800],
          colorText: Colors.white,
          duration: const Duration(seconds: 4),
        );
      }
    } catch (e) {
      Get.snackbar('Error', 'Unable to open receipt download: $e',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
    }
  }

  Future<void> pickProofImage(ImageSource source) async {
    try {
      final picked = await imagePicker.pickImage(
        source: source,
        maxWidth: 1200,
        maxHeight: 1200,
        imageQuality: 85,
      );
      if (picked != null) {
        proofFile.value = File(picked.path);
      }
    } catch (e) {
      Get.snackbar('Error', 'Failed to pick image: $e', snackPosition: SnackPosition.BOTTOM);
    }
  }

  void removeProofImage() {
    proofFile.value = null;
  }

  Future<void> submitBankTransfer() async {
    final tenant = homeController.memberData['tenant'] ?? {};
    final isRefRequired = tenant['bankReferenceRequired'] != false;
    final isProofRequired = tenant['bankProofRequired'] != false;

    final refNumber = bankRefController.text.trim();

    if (isRefRequired && refNumber.isEmpty) {
      Get.snackbar('Required Field', 'UTR / Reference Number is required by society admin.',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.amber[800], colorText: Colors.white);
      return;
    }

    if (isProofRequired && proofFile.value == null) {
      Get.snackbar('Required Field', 'Payment proof screenshot is required by society admin.',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.amber[800], colorText: Colors.white);
      return;
    }

    isSubmitting.value = true;

    try {
      String? uploadedProofUrl;
      if (proofFile.value != null) {
        uploadedProofUrl = await apiClient.uploadFile(proofFile.value!);
        if (uploadedProofUrl == null && isProofRequired) {
          Get.snackbar('Upload Failed', 'Failed to upload proof screenshot. Please try again.',
              snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
          isSubmitting.value = false;
          return;
        }
      }

      final amount = calculatePlanAmount(selectedPlan.value);

      final payload = {
        'amount': amount,
        'plan': selectedPlan.value,
        'referenceNumber': refNumber.isNotEmpty ? refNumber : null,
        'proofUrl': uploadedProofUrl,
        'notes': bankNotesController.text.trim().isNotEmpty ? bankNotesController.text.trim() : null,
      };

      final response = await apiClient.dio.post('/payments/bank-transfer', data: payload);

      if (response.statusCode == 200 || response.statusCode == 201) {
        Get.back(); // Close bottom sheet
        bankRefController.clear();
        bankNotesController.clear();
        proofFile.value = null;

        Get.snackbar(
          'Submission Received!',
          'Your bank transfer details have been submitted. Society admin will verify and issue your receipt.',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: const Color(0xFF10b981),
          colorText: Colors.white,
          duration: const Duration(seconds: 4),
        );

        await fetchPayments();
      }
    } catch (e) {
      Get.snackbar('Submission Error', 'Failed to submit bank transfer: $e',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
    } finally {
      isSubmitting.value = false;
    }
  }

  @override
  void onClose() {
    bankRefController.dispose();
    bankNotesController.dispose();
    super.onClose();
  }
}
