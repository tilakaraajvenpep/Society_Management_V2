import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/tenant_slug_controller.dart';

class TenantSlugView extends GetView<TenantSlugController> {
  const TenantSlugView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_ethernet, color: Color(0xFF2563eb)),
            tooltip: 'Server Connection',
            onPressed: controller.showServerConfigDialog,
          ),
        ],
      ),
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
                decoration: const InputDecoration(
                  labelText: 'Society Code (e.g. sunrise)',
                  prefixIcon: Icon(Icons.business),
                  hintText: 'e.g. sunrise',
                ),
                onSubmitted: (_) => controller.continueToLogin(),
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
              const SizedBox(height: 24),
              Center(
                child: InkWell(
                  onTap: controller.showServerConfigDialog,
                  borderRadius: BorderRadius.circular(8),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.dns_outlined, size: 14, color: Colors.grey),
                        const SizedBox(width: 6),
                        Obx(() => Text(
                          'Server: ${controller.currentServerUrl.value}',
                          style: const TextStyle(fontSize: 12, color: Colors.grey, decoration: TextDecoration.underline),
                        )),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
