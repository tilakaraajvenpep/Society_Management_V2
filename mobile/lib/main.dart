import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'app/core/theme/app_theme.dart';
import 'app/routes/app_pages.dart';
import 'app/core/utils/api_client.dart';
import 'app/core/translations/app_translations.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    // Note: This requires google-services.json / GoogleService-Info.plist
    // await Firebase.initializeApp();
    // await Get.putAsync(() => NotificationService().init());
  } catch (e) {
    print("Firebase initialization skipped: $e");
  }

  // Initialize services
  await Get.putAsync(() => ApiClient().init());

  runApp(
    GetMaterialApp(
      title: "SocietyArena",
      initialRoute: AppPages.INITIAL,
      getPages: AppPages.routes,
      translations: AppTranslations(),
      locale: const Locale('en', 'US'),
      fallbackLocale: const Locale('en', 'US'),
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      debugShowCheckedModeBanner: false,
    ),
  );
}
