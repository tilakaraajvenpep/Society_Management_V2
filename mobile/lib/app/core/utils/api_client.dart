import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get/get.dart' hide Response, FormData, MultipartFile;
import 'constants.dart';

class ApiClient extends GetxService {
  late Dio dio;
  final storage = const FlutterSecureStorage();

  Future<ApiClient> init() async {
    final savedBaseUrl = await storage.read(key: 'custom_base_url');
    if (savedBaseUrl != null && savedBaseUrl.trim().isNotEmpty) {
      AppConstants.baseUrl = savedBaseUrl.trim();
    } else {
      // By default use Cloud Render production server so mobile app works daily everywhere without setup!
      AppConstants.baseUrl = AppConstants.cloudRenderApi;
      await autoDetectServer();
    }

    dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {
        'Accept': 'application/json',
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read(key: 'jwt_token');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) {
        if (e.response?.statusCode == 401) {
          storage.delete(key: 'jwt_token');
          Get.offAllNamed('/login');
        }
        return handler.next(e);
      },
    ));
    return this;
  }

  Future<void> autoDetectServer() async {
    if (kIsWeb) return;

    // Check if active local dev machine server is reachable; if so, switch to it, otherwise stick to cloudRenderApi
    try {
      final probeDio = Dio(BaseOptions(
        connectTimeout: const Duration(milliseconds: 1500),
        receiveTimeout: const Duration(milliseconds: 1500),
      ));
      final response = await probeDio.get('${AppConstants.localWifiApi}/tenants/public/test');
      if (response.statusCode == 200 || response.statusCode == 404) {
        AppConstants.baseUrl = AppConstants.localWifiApi;
        return;
      }
    } catch (_) {
      // Local dev server not reachable, remain on cloudRenderApi
      AppConstants.baseUrl = AppConstants.cloudRenderApi;
    }
  }

  Future<void> updateBaseUrl(String newUrl) async {
    final cleanUrl = newUrl.trim();
    AppConstants.baseUrl = cleanUrl;
    dio.options.baseUrl = cleanUrl;
    await storage.write(key: 'custom_base_url', value: cleanUrl);
  }

  Future<String?> uploadFile(File file) async {
    try {
      final fileName = file.path.split(Platform.pathSeparator).last;
      final formData = FormData.fromMap({
        'file': await MultipartFile.fromFile(file.path, filename: fileName),
      });

      final response = await dio.post(
        '/upload/file',
        data: formData,
        options: Options(
          headers: {'Content-Type': 'multipart/form-data'},
        ),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        return response.data['url']?.toString();
      }
      return null;
    } catch (e) {
      print('Error uploading file: $e');
      return null;
    }
  }
}
