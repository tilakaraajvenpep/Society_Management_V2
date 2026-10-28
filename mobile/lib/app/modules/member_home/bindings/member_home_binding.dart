import 'package:get/get.dart';
import '../controllers/member_home_controller.dart';
import '../../member_payments/controllers/member_payments_controller.dart';
import '../../member_tickets/controllers/member_tickets_controller.dart';

class MemberHomeBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<MemberHomeController>(
      () => MemberHomeController(),
    );
    Get.lazyPut<MemberPaymentsController>(
      () => MemberPaymentsController(),
    );
    Get.lazyPut<MemberTicketsController>(
      () => MemberTicketsController(),
    );
  }
}
