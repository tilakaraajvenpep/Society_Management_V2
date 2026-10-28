import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart' as dio_lib;
import '../../../routes/app_pages.dart';
import '../../../core/utils/constants.dart';
import '../../../core/utils/api_client.dart';

class TenantSlugController extends GetxController {
  final slugController = TextEditingController();
  final isLoading = false.obs;
  final currentServerUrl = AppConstants.baseUrl.obs;
  final storage = const FlutterSecureStorage();
  final ApiClient apiClient = Get.find<ApiClient>();

  @override
  void onInit() {
    super.onInit();
    currentServerUrl.value = AppConstants.baseUrl;
    _checkExistingSession();
  }

  Future<void> _checkExistingSession() async {
    // 1. Prefill saved slug or default to 'test'
    final slug = await storage.read(key: 'tenant_slug');
    if (slug != null && slug.trim().isNotEmpty) {
      slugController.text = slug.trim();
    } else {
      slugController.text = 'test';
    }

    // 2. Auto-login if valid token exists
    final token = await storage.read(key: 'jwt_token');
    final role = await storage.read(key: 'user_role');
    if (token != null && token.isNotEmpty) {
      try {
        isLoading.value = true;
        final response = await apiClient.dio.get(
          '/members/profile',
          options: dio_lib.Options(
            sendTimeout: const Duration(seconds: 4),
            receiveTimeout: const Duration(seconds: 4),
          ),
        );
        if (response.statusCode == 200) {
          if (role == 'TENANT_ADMIN') {
            Get.offAllNamed(Routes.ADMIN_HOME);
          } else {
            Get.offAllNamed(Routes.MEMBER_HOME);
          }
          return;
        }
      } catch (_) {
        await storage.delete(key: 'jwt_token');
        await storage.delete(key: 'user_role');
      } finally {
        isLoading.value = false;
      }
    }
  }

  Future<void> continueToLogin() async {
    final slug = slugController.text.trim().toLowerCase();
    if (slug.isEmpty) {
      Get.snackbar('Error', 'Please enter a society code',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }

    isLoading.value = true;
    try {
      final response = await apiClient.dio.get('/tenants/public/$slug');
      if (response.statusCode == 200 && response.data != null) {
        final tenantName = response.data['name'] ?? slug;
        final tenantId = response.data['id'];
        await storage.write(key: 'tenant_slug', value: slug);
        Get.toNamed(Routes.LOGIN, arguments: {
          'slug': slug,
          'tenantName': tenantName,
          'tenantId': tenantId,
        });
      } else {
        Get.snackbar(
          'Society Not Found',
          'No active society found with code "$slug"',
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red.shade700,
          colorText: Colors.white,
        );
      }
    } on dio_lib.DioException catch (e) {
      String msg = 'Cannot connect to backend server';
      if (e.response?.statusCode == 404) {
        msg = 'No active society found with code "$slug"';
      } else if (e.type == dio_lib.DioExceptionType.connectionTimeout ||
          e.type == dio_lib.DioExceptionType.connectionError ||
          e.type == dio_lib.DioExceptionType.unknown) {
        msg = 'Cannot reach server at ${AppConstants.baseUrl}.\nTap the server icon above to configure your server address.';
      } else if (e.response?.data != null && e.response?.data['message'] != null) {
        msg = e.response?.data['message'];
      }
      Get.snackbar(
        'Connection Error',
        msg,
        snackPosition: SnackPosition.BOTTOM,
        backgroundColor: Colors.red.shade700,
        colorText: Colors.white,
        duration: const Duration(seconds: 5),
      );
    } catch (e) {
      Get.snackbar('Error', 'An unexpected error occurred: $e',
          snackPosition: SnackPosition.BOTTOM);
    } finally {
      isLoading.value = false;
    }
  }

  void showServerConfigDialog() {
    final textController = TextEditingController(text: AppConstants.baseUrl);
    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Row(
          children: [
            Icon(Icons.settings_ethernet, color: Color(0xFF2563eb)),
            SizedBox(width: 8),
            Text('Server Connection', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Enter backend API URL (e.g. from your Wi-Fi or Cloud):',
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: textController,
                decoration: const InputDecoration(
                  hintText: 'http://192.168.0.111:5001/api',
                  prefixIcon: Icon(Icons.link),
                ),
              ),
              const SizedBox(height: 14),
              const Text('Quick Select:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.cloud_done, size: 14, color: Colors.blue),
                    label: const Text('Cloud (Production Default)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    onPressed: () => textController.text = 'https://society-management-backend-kqs8.onrender.com/api',
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.wifi, size: 14),
                    label: const Text('Wi-Fi (192.168.0.106)', style: TextStyle(fontSize: 11)),
                    onPressed: () => textController.text = 'http://192.168.0.106:5001/api',
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.computer, size: 14),
                    label: const Text('Localhost (5001)', style: TextStyle(fontSize: 11)),
                    onPressed: () => textController.text = 'http://localhost:5001/api',
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.phone_android, size: 14),
                    label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11)),
                    onPressed: () => textController.text = 'http://10.0.2.2:5001/api',
                  ),
                ],
              )
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Get.back(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (textController.text.trim().isNotEmpty) {
                await apiClient.updateBaseUrl(textController.text.trim());
                currentServerUrl.value = AppConstants.baseUrl;
                Get.back();
                Get.snackbar('Saved', 'Server URL set to ${AppConstants.baseUrl}',
                    snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.green, colorText: Colors.white);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  @override
  void onClose() {
    slugController.dispose();
    super.onClose();
  }
}
