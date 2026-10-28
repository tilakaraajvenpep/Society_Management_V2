import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'package:dio/dio.dart' as dio_lib;
import 'package:url_launcher/url_launcher.dart';
import '../../../core/utils/api_client.dart';
import '../../../core/utils/constants.dart';
import '../../../routes/app_pages.dart';

class MemberHomeController extends GetxController {
  final ApiClient apiClient = Get.find<ApiClient>();
  
  // Navigation tab index: 0 = Dashboard, 1 = Payments, 2 = Receipts, 3 = Events, 4 = Helpdesk, 5 = Profile
  final currentTab = 0.obs;

  final isLoading = true.obs;
  final memberData = <String, dynamic>{}.obs;
  final events = <dynamic>[].obs;
  final tickets = <dynamic>[].obs;
  final announcements = <dynamic>[].obs;
  final isEventsLoading = false.obs;
  final isTicketsLoading = false.obs;

  // Branding theme color
  final themeColor = const Color(0xFF2563eb).obs;

  // Force Update state
  final isForceUpdateActive = false.obs;
  final storeUrl = ''.obs;
  final updateMessage = ''.obs;

  // Maintenance Mode state
  final isMaintenanceActive = false.obs;
  final maintenanceMessage = ''.obs;

  // Selected language
  final selectedLocale = 'en_US'.obs;

  @override
  void onInit() {
    super.onInit();
    refreshAll();
  }

  Future<void> refreshAll() async {
    isLoading.value = true;
    await Future.wait([
      fetchProfile(),
      fetchEvents(),
      fetchTickets(),
      fetchAnnouncements(),
    ]);
    isLoading.value = false;
  }

  Future<void> fetchProfile() async {
    try {
      final response = await apiClient.dio.get('/members/profile');
      if (response.statusCode == 200 && response.data != null) {
        memberData.value = Map<String, dynamic>.from(response.data);
        _applyTenantSettings();
      }
    } on dio_lib.DioException catch (e) {
      print('Error loading member profile: ${e.message}');
    } catch (e) {
      print('Unexpected error loading profile: $e');
    }
  }

  Future<void> fetchEvents() async {
    isEventsLoading.value = true;
    try {
      final response = await apiClient.dio.get('/events');
      if (response.statusCode == 200 && response.data != null) {
        events.value = List.from(response.data);
      }
    } catch (e) {
      print('Error loading events: $e');
    } finally {
      isEventsLoading.value = false;
    }
  }

  Future<void> fetchTickets() async {
    isTicketsLoading.value = true;
    try {
      final response = await apiClient.dio.get('/tickets');
      if (response.statusCode == 200 && response.data != null) {
        tickets.value = List.from(response.data);
      }
    } catch (e) {
      print('Error loading tickets: $e');
    } finally {
      isTicketsLoading.value = false;
    }
  }

  Future<void> fetchAnnouncements() async {
    try {
      final response = await apiClient.dio.get('/notifications');
      if (response.statusCode == 200 && response.data != null) {
        announcements.value = List.from(response.data);
      }
    } catch (e) {
      print('Error loading announcements: $e');
    }
  }

  void changeTab(int index) {
    currentTab.value = index;
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
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enter your backend API base URL:',
              style: TextStyle(fontSize: 13, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: textController,
              decoration: const InputDecoration(
                hintText: 'e.g. http://10.0.2.2:5001/api',
                prefixIcon: Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ActionChip(
                  label: const Text('Wi-Fi (192.168.0.107)', style: TextStyle(fontSize: 11)),
                  onPressed: () => textController.text = 'http://192.168.0.107:5001/api',
                ),
                ActionChip(
                  label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11)),
                  onPressed: () => textController.text = 'http://10.0.2.2:5001/api',
                ),
                ActionChip(
                  label: const Text('Localhost (5001)', style: TextStyle(fontSize: 11)),
                  onPressed: () => textController.text = 'http://localhost:5001/api',
                ),
                ActionChip(
                  label: const Text('Render Cloud', style: TextStyle(fontSize: 11)),
                  onPressed: () => textController.text = 'https://society-management-backend-kqs8.onrender.com/api',
                ),
              ],
            )
          ],
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
                Get.back();
                Get.snackbar('Success', 'Server URL updated to ${AppConstants.baseUrl}',
                    snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.green, colorText: Colors.white);
                refreshAll();
              }
            },
            child: const Text('Save & Reconnect'),
          ),
        ],
      ),
    );
  }

  void logout() async {
    Get.dialog(
      AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Confirm Logout'),
        content: const Text('Are you sure you want to log out of your society member account?'),
        actions: [
          TextButton(onPressed: () => Get.back(), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFef4444)),
            onPressed: () async {
              Get.back();
              await apiClient.storage.delete(key: 'jwt_token');
              await apiClient.storage.delete(key: 'user_role');
              final savedSlug = await apiClient.storage.read(key: 'tenant_slug') ?? 'test';
              Get.offAllNamed(Routes.LOGIN, arguments: {'slug': savedSlug});
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  void _applyTenantSettings() {
    final tenant = memberData['tenant'] as Map<dynamic, dynamic>? ?? {};

    // 1. Branding Theme Color
    try {
      dynamic brandingRaw = tenant['brandingConfig'];
      Map<String, dynamic> brandingMap = {};
      if (brandingRaw is String && brandingRaw.isNotEmpty) {
        brandingMap = jsonDecode(brandingRaw);
      } else if (brandingRaw is Map) {
        brandingMap = Map<String, dynamic>.from(brandingRaw);
      }
      if (brandingMap['mobileThemeColor'] != null && brandingMap['mobileThemeColor'].toString().isNotEmpty) {
        final hex = brandingMap['mobileThemeColor'].toString().replaceAll('#', '').trim();
        if (hex.length == 6) {
          themeColor.value = Color(int.parse('FF$hex', radix: 16));
        }
      }
    } catch (e) {
      print('Error parsing branding config: $e');
    }

    // 2. App Version & Force Update
    try {
      dynamic appVerRaw = tenant['appVersionConfig'];
      Map<String, dynamic> appVerMap = {};
      if (appVerRaw is String && appVerRaw.isNotEmpty) {
        appVerMap = jsonDecode(appVerRaw);
      } else if (appVerRaw is Map) {
        appVerMap = Map<String, dynamic>.from(appVerRaw);
      }

      final androidConf = appVerMap['android'] as Map<dynamic, dynamic>? ?? {};
      final supportedVersion = androidConf['supportedVersion']?.toString() ?? '1.0.0';
      final forceUpdate = androidConf['forceUpdate'] == true;
      final targetStoreUrl = androidConf['storeUrl']?.toString() ?? 'https://play.google.com';

      storeUrl.value = targetStoreUrl;

      if (forceUpdate && isVersionOutdated(AppConstants.appVersion, supportedVersion)) {
        isForceUpdateActive.value = true;
        updateMessage.value = 'A new version ($supportedVersion) is required to use SocietyArena. Please update now to continue.';
      } else {
        isForceUpdateActive.value = false;
      }

      // 3. Maintenance Mode
      final bool appVerMaintenance = appVerMap['maintenanceEnabled'] == true;
      final String appVerMsg = appVerMap['maintenanceMessage']?.toString() ?? '';

      dynamic maintRaw = tenant['maintenanceConfig'];
      Map<String, dynamic> tenantMaint = {};
      if (maintRaw is String && maintRaw.isNotEmpty) {
        tenantMaint = jsonDecode(maintRaw);
      } else if (maintRaw is Map) {
        tenantMaint = Map<String, dynamic>.from(maintRaw);
      }

      // Check Global Maintenance from /members/profile data
      dynamic globalMaintRaw = memberData['globalMaintenance'];
      Map<String, dynamic> globalMaint = {};
      if (globalMaintRaw is String && globalMaintRaw.isNotEmpty) {
        globalMaint = jsonDecode(globalMaintRaw);
      } else if (globalMaintRaw is Map) {
        globalMaint = Map<String, dynamic>.from(globalMaintRaw);
      }

      final String memberEmail = (memberData['email'] ?? '').toString().toLowerCase().trim();

      bool isGlobalMaintenance = false;
      String globalMaintMsg = '';
      if (globalMaint['isMaintenance'] == true) {
        final List<dynamic> gmTargets = globalMaint['targets'] as List<dynamic>? ?? [];
        if (gmTargets.contains('MOBILE_APP') || gmTargets.contains('ALL')) {
          final List<dynamic> gmWhitelisted = globalMaint['whitelistedEmails'] as List<dynamic>? ?? [];
          final bool isGWhitelisted = gmWhitelisted.map((e) => e.toString().toLowerCase().trim()).contains(memberEmail);
          if (!isGWhitelisted) {
            isGlobalMaintenance = true;
            globalMaintMsg = globalMaint['message']?.toString() ?? '';
          }
        }
      }

      final List<dynamic> tmTargets = tenantMaint['targets'] as List<dynamic>? ?? [];
      final bool tenantMaintenance = tenantMaint['isMaintenance'] == true &&
          (tmTargets.contains('MOBILE_APP') || tmTargets.contains('ALL'));

      final List<dynamic> whitelisted = tenantMaint['whitelistedEmails'] as List<dynamic>? ?? [];
      final bool isWhitelisted = whitelisted.map((e) => e.toString().toLowerCase().trim()).contains(memberEmail);

      if (isGlobalMaintenance) {
        isMaintenanceActive.value = true;
        maintenanceMessage.value = globalMaintMsg.isNotEmpty ? globalMaintMsg : 'Platform-wide maintenance in progress. Please check back later.';
      } else if ((appVerMaintenance || tenantMaintenance) && !isWhitelisted) {
        isMaintenanceActive.value = true;
        maintenanceMessage.value = appVerMsg.isNotEmpty ? appVerMsg : (tenantMaint['message']?.toString() ?? 'Mobile app is currently under maintenance. Please check back later.');
      } else {
        isMaintenanceActive.value = false;
      }
    } catch (e) {
      print('Error parsing app version & maintenance: $e');
    }
  }

  bool isVersionOutdated(String current, String supported) {
    try {
      List<int> c = current.split('.').map((p) => int.tryParse(p) ?? 0).toList();
      List<int> s = supported.split('.').map((p) => int.tryParse(p) ?? 0).toList();
      while (c.length < 3) c.add(0);
      while (s.length < 3) s.add(0);
      for (int i = 0; i < 3; i++) {
        if (c[i] < s[i]) return true;
        if (c[i] > s[i]) return false;
      }
    } catch (_) {}
    return false;
  }

  Future<void> openStoreUrl() async {
    final url = storeUrl.value.isNotEmpty ? storeUrl.value : 'https://play.google.com';
    try {
      final uri = Uri.parse(url);
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (e) {
      Get.snackbar('Error', 'Unable to open store link: $url',
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
    }
  }

  bool isMenuEnabled(String menuId) {
    final tenant = memberData['tenant'] as Map<dynamic, dynamic>? ?? {};

    // Check superadmin permissions
    if (tenant['superadminMenuConfig'] != null) {
      try {
        final sa = tenant['superadminMenuConfig'] is String
            ? jsonDecode(tenant['superadminMenuConfig'])
            : tenant['superadminMenuConfig'];
        if (sa != null && sa['memberMobile'] != null && sa['memberMobile'][menuId] == false) {
          return false;
        }
      } catch (_) {}
    }

    // Check tenant admin permissions
    if (tenant['tenantMenuConfig'] != null) {
      try {
        final tm = tenant['tenantMenuConfig'] is String
            ? jsonDecode(tenant['tenantMenuConfig'])
            : tenant['tenantMenuConfig'];
        if (tm != null && tm['memberMobile'] != null && tm['memberMobile'][menuId] == false) {
          return false;
        }
      } catch (_) {}
    }

    return true;
  }

  int getTabIndexForMenu(String menuId) {
    int index = 0;
    if (isMenuEnabled('dashboard')) {
      if (menuId == 'dashboard') return index;
      index++;
    }
    if (isMenuEnabled('payments')) {
      if (menuId == 'payments') return index;
      index++;
    }
    if (isMenuEnabled('receipts')) {
      if (menuId == 'receipts') return index;
      index++;
    }
    if (isMenuEnabled('events')) {
      if (menuId == 'events') return index;
      index++;
    }
    if (isMenuEnabled('helpdesk')) {
      if (menuId == 'helpdesk') return index;
      index++;
    }
    if (isMenuEnabled('profile')) {
      if (menuId == 'profile') return index;
      index++;
    }
    return 0;
  }

  void navigateToMenu(String menuId) {
    if (!isMenuEnabled(menuId)) return;
    final idx = getTabIndexForMenu(menuId);
    changeTab(idx);
  }

  void changeLanguage(String langCode, String countryCode) {
    selectedLocale.value = '${langCode}_$countryCode';
    Get.updateLocale(Locale(langCode, countryCode));
    Get.snackbar(
      'Language Updated',
      'Language switched successfully!',
      snackPosition: SnackPosition.BOTTOM,
      backgroundColor: themeColor.value,
      colorText: Colors.white,
      duration: const Duration(seconds: 2),
    );
  }

  Future<bool> updateProfile({
    required String name,
    required String mobile,
    required String email,
    String? password,
  }) async {
    try {
      final payload = <String, dynamic>{
        'name': name.trim(),
        'mobile': mobile.trim(),
        'email': email.trim().toLowerCase(),
      };
      if (password != null && password.trim().isNotEmpty) {
        payload['password'] = password.trim();
      }

      final res = await apiClient.dio.patch('/members/profile', data: payload);
      if (res.statusCode == 200) {
        Get.snackbar('Success', 'Profile updated successfully!',
            snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.green, colorText: Colors.white);
        await fetchProfile();
        return true;
      }
      return false;
    } on dio_lib.DioException catch (e) {
      final msg = e.response?.data?['message'] ?? e.message ?? 'Error updating profile';
      Get.snackbar('Error', msg.toString(),
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
      return false;
    } catch (e) {
      Get.snackbar('Error', e.toString(),
          snackPosition: SnackPosition.BOTTOM, backgroundColor: Colors.red, colorText: Colors.white);
      return false;
    }
  }
}
