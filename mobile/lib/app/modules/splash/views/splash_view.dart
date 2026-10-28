import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../controllers/splash_controller.dart';
import '../../../core/utils/constants.dart';

class SplashView extends GetView<SplashController> {
  const SplashView({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B19),
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              Color(0xFF040711),
              Color(0xFF0A1329),
              Color(0xFF050814),
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const SizedBox(height: 20),
              
              // Center Branding
              Expanded(
                child: Center(
                  child: AnimatedBuilder(
                    animation: controller.animController,
                    builder: (context, child) {
                      return FadeTransition(
                        opacity: controller.opacityAnimation,
                        child: ScaleTransition(
                          scale: controller.scaleAnimation,
                          child: child,
                        ),
                      );
                    },
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // Logo Container with Golden Glow
                        Container(
                          width: 140,
                          height: 140,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(32),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFFD4AF37).withOpacity(0.35),
                                blurRadius: 40,
                                spreadRadius: 4,
                                offset: const Offset(0, 10),
                              ),
                              BoxShadow(
                                color: Colors.black.withOpacity(0.5),
                                blurRadius: 20,
                                offset: const Offset(0, 8),
                              ),
                            ],
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(32),
                            child: Image.asset(
                              'assets/images/societyarena_logo.jpeg',
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(height: 32),
                        
                        // App Name in Luxury Gold
                        const Text(
                          'SOCIETYARENA',
                          style: TextStyle(
                            fontSize: 30,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 4.5,
                            color: Color(0xFFF3E5AB),
                            shadows: [
                              Shadow(
                                color: Color(0x80D4AF37),
                                blurRadius: 16,
                                offset: Offset(0, 2),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 10),
                        
                        // Tagline
                        Text(
                          'Next-Gen Smart Society Living',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w400,
                            letterSpacing: 1.2,
                            color: Colors.white.withOpacity(0.75),
                          ),
                        ),
                        const SizedBox(height: 48),

                        // Sleek Gold Spinner
                        SizedBox(
                          width: 28,
                          height: 28,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              const Color(0xFFD4AF37).withOpacity(0.85),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        
                        // Dynamic Status Text
                        Obx(() => Text(
                          controller.statusText.value,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.white.withOpacity(0.5),
                            letterSpacing: 0.5,
                          ),
                        )),
                      ],
                    ),
                  ),
                ),
              ),

              // Bottom Info
              Padding(
                padding: const EdgeInsets.only(bottom: 24.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0xFF10B981),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Cloud Sync Active • v${AppConstants.appVersion}',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withOpacity(0.4),
                            letterSpacing: 0.8,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
