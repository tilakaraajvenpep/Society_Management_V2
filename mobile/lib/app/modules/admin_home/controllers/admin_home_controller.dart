import 'dart:convert';
import 'package:get/get.dart';
import '../../../core/utils/api_client.dart';
import 'package:dio/dio.dart' as dio_lib;

class AdminHomeController extends GetxController {
  final ApiClient apiClient = Get.find<ApiClient>();
  final isLoading = true.obs;
  final summaryData = {}.obs;
  final isMaintenanceActive = false.obs;
  final maintenanceMessage = ''.obs;

  @override
  void onInit() {
    super.onInit();
    fetchSummary();
  }

  Future<void> fetchSummary() async {
    isLoading.value = true;
    try {
      final response = await apiClient.dio.get('/reports/summary');
      if (response.statusCode == 200) {
        summaryData.value = response.data;
        _checkMaintenance();
      }
    } on dio_lib.DioException catch (e) {
      Get.snackbar('Error', 'Failed to load summary data');
    } catch (e) {
      Get.snackbar('Error', 'An unexpected error occurred');
    } finally {
      isLoading.value = false;
    }
  }

  void _checkMaintenance() {
    try {
      final gm = summaryData['globalMaintenance'];
      if (gm != null) {
        Map<String, dynamic> gmMap = {};
        if (gm is String) {
          try { gmMap = jsonDecode(gm); } catch (_) {}
        } else if (gm is Map) {
          gmMap = Map<String, dynamic>.from(gm);
        }
        if (gmMap['isMaintenance'] == true) {
          final targets = gmMap['targets'] as List<dynamic>? ?? [];
          if (targets.contains('ADMIN_WEB') || targets.contains('ALL') || targets.contains('MOBILE_APP')) {
            isMaintenanceActive.value = true;
            maintenanceMessage.value = gmMap['message']?.toString() ?? 'Platform-wide maintenance in progress. Please check back later.';
            return;
          }
        }
      }

      final tm = summaryData['maintenanceConfig'];
      if (tm != null) {
        Map<String, dynamic> tmMap = {};
        if (tm is String) {
          try { tmMap = jsonDecode(tm); } catch (_) {}
        } else if (tm is Map) {
          tmMap = Map<String, dynamic>.from(tm);
        }
        if (tmMap['isMaintenance'] == true) {
          final targets = tmMap['targets'] as List<dynamic>? ?? [];
          if (targets.contains('ADMIN_WEB') || targets.contains('ALL') || targets.contains('MOBILE_APP')) {
            isMaintenanceActive.value = true;
            maintenanceMessage.value = tmMap['message']?.toString() ?? 'Society admin portal is under maintenance. Please check back later.';
            return;
          }
        }
      }
      isMaintenanceActive.value = false;
    } catch (e) {
      print('Admin maintenance check error: $e');
    }
  }

  bool isMenuEnabled(String menuId) {
    try {
      final sa = summaryData['superadminMenuConfig'];
      if (sa != null) {
        Map<String, dynamic> saMap = {};
        if (sa is String) {
          try { saMap = jsonDecode(sa); } catch (_) {}
        } else if (sa is Map) {
          saMap = Map<String, dynamic>.from(sa);
        }
        if (saMap['admin'] != null && saMap['admin'][menuId] == false) {
          return false;
        }
      }
    } catch (_) {}
    return true;
  }

  void logout() async {
    await apiClient.storage.delete(key: 'jwt_token');
    await apiClient.storage.delete(key: 'user_role');
    final savedSlug = await apiClient.storage.read(key: 'tenant_slug') ?? 'test';
    Get.offAllNamed('/login', arguments: {'slug': savedSlug});
  }
}
