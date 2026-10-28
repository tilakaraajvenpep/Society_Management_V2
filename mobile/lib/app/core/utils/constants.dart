import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

class AppConstants {
  // Candidate URLs
  static const String cloudRenderApi = 'https://society-management-backend-kqs8.onrender.com/api';
  static const String localWifiApi = 'http://192.168.0.106:5001/api';
  static const String localHostApi = 'http://localhost:5001/api';
  static const String emulatorApi = 'http://10.0.2.2:5001/api';

  // Production Cloud Backend is the default so mobile app works daily out-of-the-box everywhere!
  static String baseUrl = cloudRenderApi;
  static const String appName = 'SocietyArena';
  static const String appVersion = '2.0.0';

  static String get baseOrigin {
    final uri = Uri.tryParse(baseUrl);
    if (uri != null && uri.hasAuthority) {
      return '${uri.scheme}://${uri.authority}';
    }
    return 'https://society-management-backend-kqs8.onrender.com';
  }

  static String resolveImageUrl(String? url) {
    if (url == null || url.trim().isEmpty) return '';
    final trimmed = url.trim();
    final uri = Uri.tryParse(trimmed);
    if (uri != null && uri.hasScheme) {
      final host = uri.host.toLowerCase();
      // If the URL points to localhost, 127.0.0.1, or 10.0.2.2, rewrite host to active baseOrigin
      if (host == 'localhost' || host == '127.0.0.1' || host == '10.0.2.2' || uri.path.startsWith('/uploads')) {
        return '$baseOrigin${uri.path}';
      }
      return trimmed;
    }
    // Prepend origin if relative path like /uploads/...
    final cleanPath = trimmed.startsWith('/') ? trimmed : '/$trimmed';
    return '$baseOrigin$cleanPath';
  }

  static String formatCurrency(dynamic amount) {
    if (amount == null) return '₹0';
    final numVal = num.tryParse(amount.toString()) ?? 0;
    final formatter = NumberFormat.currency(
      locale: 'en_IN',
      symbol: '₹',
      decimalDigits: numVal % 1 == 0 ? 0 : 2,
    );
    return formatter.format(numVal);
  }

  static String formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return DateFormat('dd MMM yyyy').format(date);
    } catch (_) {
      return dateStr.split('T')[0];
    }
  }

  static String formatDateTime(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '-';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return DateFormat('dd MMM yyyy • hh:mm a').format(date);
    } catch (_) {
      return dateStr;
    }
  }
}
