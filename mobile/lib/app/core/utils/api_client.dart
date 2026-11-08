import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:get/get.dart' hide Response, FormData, MultipartFile;
import 'constants.dart';

class ApiClient extends GetxService {
  late Dio dio;
  final storage = const FlutterSecureStorage();
  bool _isAutoDetecting = false;

  Future<ApiClient> init() async {
    // 1. First probe candidate hosts dynamically to find the best working server
    await autoDetectServer();

    dio = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {
        'Accept': 'application/json',
      },
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await storage.read(key: 'jwt_token');
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401) {
          await storage.delete(key: 'jwt_token');
          Get.offAllNamed('/login');
          return handler.next(e);
        }

        // Automatic seamless failover to alternative candidate host on connection drop
        final isConnectionError = e.type == DioExceptionType.connectionTimeout ||
            e.type == DioExceptionType.connectionError ||
            e.type == DioExceptionType.unknown ||
            (e.response != null && e.response!.statusCode! >= 502);

        if (isConnectionError && !_isAutoDetecting) {
          final oldUrl = AppConstants.baseUrl;
          final switched = await _failoverToNextHost(oldUrl);
          if (switched) {
            try {
              final newOptions = e.requestOptions;
              newOptions.baseUrl = AppConstants.baseUrl;
              final retryResponse = await dio.fetch(newOptions);
              return handler.resolve(retryResponse);
            } catch (_) {
              // Retry failed, proceed with error
            }
          }
        }

        return handler.next(e);
      },
    ));
    return this;
  }

  /// Automatically tests candidate hosts with fast timeouts and selects the best active server
  Future<String> autoDetectServer() async {
    if (kIsWeb) return AppConstants.baseUrl;
    _isAutoDetecting = true;

    try {
      for (final host in AppConstants.candidateHosts) {
        try {
          final isCloud = host.startsWith('https://');
          final timeout = isCloud ? const Duration(seconds: 4) : const Duration(milliseconds: 1400);
          final probeDio = Dio(BaseOptions(
            connectTimeout: timeout,
            receiveTimeout: timeout,
            validateStatus: (status) => status != null && status < 500,
          ));

          // Probe public endpoint or root API
          final probeUrl = '$host/tenants/public/${AppConstants.defaultTenantSlug}';
          final response = await probeDio.get(probeUrl);
          if (response.statusCode == 200 || response.statusCode == 404) {
            AppConstants.baseUrl = host;
            if (Get.isRegistered<ApiClient>()) {
              dio.options.baseUrl = host;
            }
            if (kDebugMode) {
              print('[ApiClient] Successfully connected to server: $host');
            }
            _isAutoDetecting = false;
            return host;
          }
        } catch (_) {
          // Try next candidate host silently
          continue;
        }
      }

      // Fallback to cloud if local hosts unavailable
      AppConstants.baseUrl = AppConstants.cloudRenderApi;
      if (Get.isRegistered<ApiClient>()) {
        dio.options.baseUrl = AppConstants.cloudRenderApi;
      }
      return AppConstants.baseUrl;
    } finally {
      _isAutoDetecting = false;
    }
  }

  Future<bool> _failoverToNextHost(String failedHost) async {
    _isAutoDetecting = true;
    try {
      final probeDio = Dio(BaseOptions(
        connectTimeout: const Duration(milliseconds: 1400),
        receiveTimeout: const Duration(milliseconds: 1400),
        validateStatus: (status) => status != null && status < 500,
      ));

      for (final host in AppConstants.candidateHosts) {
        if (host == failedHost) continue;
        try {
          final probeUrl = '$host/tenants/public/${AppConstants.defaultTenantSlug}';
          final response = await probeDio.get(probeUrl);
          if (response.statusCode == 200 || response.statusCode == 404) {
            AppConstants.baseUrl = host;
            dio.options.baseUrl = host;
            if (kDebugMode) {
              print('[ApiClient] Auto-failover succeeded to: $host');
            }
            return true;
          }
        } catch (_) {
          continue;
        }
      }
      return false;
    } finally {
      _isAutoDetecting = false;
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
      if (kDebugMode) {
        print('Error uploading file: $e');
      }
      return null;
    }
  }
}
