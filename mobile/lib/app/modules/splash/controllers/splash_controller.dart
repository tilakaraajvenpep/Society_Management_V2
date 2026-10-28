import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart' as dio_lib;
import '../../../routes/app_pages.dart';
import '../../../core/utils/api_client.dart';

class SplashController extends GetxController with GetSingleTickerProviderStateMixin {
  late AnimationController animController;
  late Animation<double> scaleAnimation;
  late Animation<double> opacityAnimation;

  final storage = const FlutterSecureStorage();
  final ApiClient apiClient = Get.find<ApiClient>();
  final statusText = 'Connecting to SocietyArena...'.obs;

  @override
  void onInit() {
    super.onInit();
    animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    scaleAnimation = CurvedAnimation(
      parent: animController,
      curve: Curves.easeOutBack,
    );

    opacityAnimation = CurvedAnimation(
      parent: animController,
      curve: Curves.easeIn,
    );

    animController.forward();
    _initializeApp();
  }

  Future<void> _initializeApp() async {
    // 1. Minimum display time for branding presentation
    await Future.delayed(const Duration(milliseconds: 2200));

    try {
      statusText.value = 'Verifying session...';
      final token = await storage.read(key: 'jwt_token');
      final role = await storage.read(key: 'user_role');

      if (token != null && token.isNotEmpty) {
        try {
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
          // If offline or profile check times out, fallback to tenant or login
        }
      }

      // Check if previously entered a tenant slug
      final savedSlug = await storage.read(key: 'tenant_slug');
      if (savedSlug != null && savedSlug.trim().isNotEmpty) {
        try {
          final res = await apiClient.dio.get(
            '/tenants/public/$savedSlug',
            options: dio_lib.Options(
              sendTimeout: const Duration(seconds: 4),
              receiveTimeout: const Duration(seconds: 4),
            ),
          );
          if (res.statusCode == 200 && res.data != null) {
            Get.offAllNamed(Routes.LOGIN, arguments: {
              'slug': savedSlug,
              'tenantName': res.data['name'] ?? savedSlug,
              'tenantId': res.data['id'],
            });
            return;
          }
        } catch (_) {
          // Fall through to tenant slug
        }
      }

      Get.offAllNamed(Routes.TENANT_SLUG);
    } catch (_) {
      Get.offAllNamed(Routes.TENANT_SLUG);
    }
  }

  @override
  void onClose() {
    animController.dispose();
    super.onClose();
  }
}
