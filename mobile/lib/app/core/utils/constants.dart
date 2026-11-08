import 'package:flutter/foundation.dart';
import 'package:intl/intl.dart';

class AppConstants {
  // Candidate backend endpoints for zero-config multi-environment fallback:
  // 1. Cloud production deployment (https://society-management-v2.vercel.app/)
  // 2. USB cable direct connection via adb reverse (tcp:5001)
  // 3. Local Wi-Fi network host IPs
  // 4. Android emulator loopback
  static const List<String> candidateHosts = [
    'https://society-management-backend-94o1.onrender.com/api', // Cloud production backend
    'http://127.0.0.1:5001/api',       // USB Direct with adb reverse
    'http://localhost:5001/api',       // USB / Localhost
    'http://192.168.0.108:5001/api',   // Active Wi-Fi Host IP
    'http://10.0.2.2:5001/api',        // Android Emulator
    'http://192.168.0.106:5001/api',   // Alternative Wi-Fi IP
    'http://192.168.0.101:5001/api',   // Alternative Wi-Fi IP
    'http://192.168.56.1:5001/api',    // Ethernet / Local adapter
  ];

  static const String cloudRenderApi = 'https://society-management-backend-94o1.onrender.com/api';
  static const String defaultTenantSlug = 'test';

  // Active base URL initialized to cloud production, with dynamic fallback
  static String baseUrl = 'https://society-management-backend-94o1.onrender.com/api';
  static const String appName = 'SocietyArena';
  static const String appVersion = '2.0.0';

  static String get baseOrigin {
    final uri = Uri.tryParse(baseUrl);
    if (uri != null && uri.hasAuthority) {
      return '${uri.scheme}://${uri.authority}';
    }
    return 'https://society-management-backend-94o1.onrender.com';
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
