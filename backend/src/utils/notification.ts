import prisma from "./prisma";

export interface CreateNotificationParams {
  tenantId: string;
  userId: string;
  title: string;
  message: string;
  type?: string;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    return await prisma.notification.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "INFO",
      },
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

export interface NotifyTenantAdminsParams {
  tenantId: string;
  title: string;
  message: string;
  type?: string;
}

export async function notifyTenantAdmins(params: NotifyTenantAdminsParams) {
  try {
    const admins = await prisma.user.findMany({
      where: {
        tenantId: params.tenantId,
        role: "TENANT_ADMIN",
      },
      select: { id: true },
    });

    const notificationsData = admins.map((admin) => ({
      tenantId: params.tenantId,
      userId: admin.id,
      title: params.title,
      message: params.message,
      type: params.type || "INFO",
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData,
      });
    }
  } catch (error) {
    console.error("Error notifying tenant admins:", error);
  }
}

export interface NotifyMemberParams {
  tenantId: string;
  memberId: string;
  title: string;
  message: string;
  type?: string;
}

export async function notifyMember(params: NotifyMemberParams) {
  try {
    const member = await prisma.member.findUnique({
      where: { id: params.memberId },
      select: { userId: true, secondaryUserId: true },
    });

    if (member) {
      if (member.userId) {
        await createNotification({
          tenantId: params.tenantId,
          userId: member.userId,
          title: params.title,
          message: params.message,
          type: params.type,
        });
      }
      if (member.secondaryUserId) {
        await createNotification({
          tenantId: params.tenantId,
          userId: member.secondaryUserId,
          title: params.title,
          message: params.message,
          type: params.type,
        });
      }
    }
  } catch (error) {
    console.error("Error notifying member:", error);
  }
}
