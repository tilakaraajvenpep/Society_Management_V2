import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart' as dio_lib;
import '../../../routes/app_pages.dart';
import '../../../core/utils/api_client.dart';

class LoginController extends GetxController {
  final emailController = TextEditingController();
  final passwordController = TextEditingController();
  final isLoading = false.obs;
  final isPasswordVisible = false.obs;
  final slug = ''.obs;
  final tenantName = ''.obs;
  final tenantId = ''.obs;
  final storage = const FlutterSecureStorage();
  final ApiClient apiClient = Get.find<ApiClient>();

  @override
  void onInit() {
    super.onInit();
    if (Get.arguments != null) {
      if (Get.arguments['slug'] != null) slug.value = Get.arguments['slug'];
      if (Get.arguments['tenantName'] != null) tenantName.value = Get.arguments['tenantName'];
      if (Get.arguments['tenantId'] != null) tenantId.value = Get.arguments['tenantId'];
    }
    if (slug.value.isEmpty) {
      storage.read(key: 'tenant_slug').then((saved) {
        if (saved != null && saved.isNotEmpty) {
          slug.value = saved;
        }
      });
    }
  }

  void togglePasswordVisibility() {
    isPasswordVisible.value = !isPasswordVisible.value;
  }

  Future<void> login() async {
    final email = emailController.text.trim();
    final password = passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      Get.snackbar('Error', 'Please enter both email/mobile and password',
          snackPosition: SnackPosition.BOTTOM);
      return;
    }

    isLoading.value = true;

    try {
      final response = await apiClient.dio.post(
        '/auth/login',
        data: {
          'identifier': email,
          'email': email,
          'password': password,
          'tenantSlug': slug.value,
          if (tenantId.value.isNotEmpty) 'tenantId': tenantId.value,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final token = data['token'];
        final role = data['user']['role'];

        await storage.write(key: 'jwt_token', value: token);
        await storage.write(key: 'user_role', value: role);
        if (slug.value.isNotEmpty) {
          await storage.write(key: 'tenant_slug', value: slug.value);
        }

        if (role == 'MEMBER') {
          Get.offAllNamed(Routes.MEMBER_HOME);
        } else if (role == 'TENANT_ADMIN') {
          Get.offAllNamed(Routes.ADMIN_HOME);
        } else {
          Get.snackbar('Error', 'Access restricted to members and admins.',
              snackPosition: SnackPosition.BOTTOM);
        }
      }
    } on dio_lib.DioException catch (e) {
      String msg = 'Login failed';
      if (e.response?.data != null && e.response?.data['message'] != null) {
        msg = e.response?.data['message'];
      } else if (e.type == dio_lib.DioExceptionType.connectionTimeout ||
                 e.type == dio_lib.DioExceptionType.connectionError) {
        msg = 'Connection to server failed. Please check network or server settings.';
      }
      Get.snackbar('Error', msg,
          snackPosition: SnackPosition.BOTTOM,
          backgroundColor: Colors.red.shade700,
          colorText: Colors.white);
    } catch (e) {
      Get.snackbar('Error', 'An unexpected error occurred: $e',
          snackPosition: SnackPosition.BOTTOM);
    } finally {
      isLoading.value = false;
    }
  }

  @override
  void onClose() {
    emailController.dispose();
    passwordController.dispose();
    super.onClose();
  }
}
