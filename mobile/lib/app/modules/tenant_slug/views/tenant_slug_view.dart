import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/tenant_slug_controller.dart';

class TenantSlugView extends GetView<TenantSlugController> {
  const TenantSlugView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  height: 90,
                  width: 90,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.12),
                        blurRadius: 16,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(20),
                    child: Image.asset(
                      'assets/images/societyarena_logo.jpeg',
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              const Text(
                'Welcome to SocietyArena',
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF0f172a),
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Enter your Society Code to connect to your community.',
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 40),
              TextField(
                controller: controller.slugController,
                decoration: InputDecoration(
                  labelText: 'Society Code (e.g. test, sms, sunrise)',
                  prefixIcon: const Icon(Icons.business),
                  hintText: 'e.g. test',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                ),
                onSubmitted: (_) => controller.continueToLogin(),
              ),
              const SizedBox(height: 12),
              const Text(
                'Available Societies:',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF64748B)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 6),
              Wrap(
                spacing: 8,
                runSpacing: 6,
                alignment: WrapAlignment.center,
                children: [
                  ActionChip(
                    avatar: const Icon(Icons.apartment, size: 14, color: Color(0xFF2563EB)),
                    label: const Text('test', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      controller.slugController.text = 'test';
                      controller.continueToLogin();
                    },
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.apartment, size: 14, color: Color(0xFF2563EB)),
                    label: const Text('sms', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      controller.slugController.text = 'sms';
                      controller.continueToLogin();
                    },
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.apartment, size: 14, color: Color(0xFF2563EB)),
                    label: const Text('greenvalley', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      controller.slugController.text = 'greenvalley';
                      controller.continueToLogin();
                    },
                  ),
                  ActionChip(
                    avatar: const Icon(Icons.apartment, size: 14, color: Color(0xFF2563EB)),
                    label: const Text('sunrise', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    onPressed: () {
                      controller.slugController.text = 'sunrise';
                      controller.continueToLogin();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Obx(() => ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563eb),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: controller.isLoading.value
                    ? null
                    : controller.continueToLogin,
                child: controller.isLoading.value
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Continue to Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              )),
            ],
          ),
        ),
      ),
    );
  }
}
