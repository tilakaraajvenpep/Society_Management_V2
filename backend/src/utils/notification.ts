import prisma from "./prisma";
import nodemailer from "nodemailer";

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

async function sendMail(toEmail: string, subject: string, body: string, tenantName: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      await transporter.sendMail({
        from: `"${tenantName} Management" <${smtpUser}>`,
        to: toEmail,
        subject: subject,
        text: body
      });
      console.log(`[Email Notification] Sent successfully to ${toEmail}`);
    } catch (error: any) {
      console.error(`[Email Notification] Failed to send to ${toEmail}:`, error.message);
    }
  } else {
    console.log(`
=========================================
[MOCK EMAIL NOTIFICATION] (SMTP Not Configured)
To: ${toEmail}
Subject: ${subject}
Body:
${body}
=========================================
    `);
  }
}

export async function notifyMember(params: NotifyMemberParams) {
  try {
    const member = await prisma.member.findUnique({
      where: { id: params.memberId },
      select: { userId: true, secondaryUserId: true, email: true, secondaryEmail: true, name: true },
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

      // Fetch tenant name & Send Emails
      const tenant = await prisma.tenant.findUnique({
        where: { id: params.tenantId },
        select: { name: true }
      });
      const tenantName = tenant?.name || "Society Management";

      const subject = `${params.title} - ${tenantName}`;
      const emailBody = `
Dear ${member.name},

${params.message}

Best regards,
Management Committee
${tenantName}
      `;

      if (member.email) {
        await sendMail(member.email, subject, emailBody, tenantName);
      }
      if (member.secondaryEmail) {
        await sendMail(member.secondaryEmail, subject, emailBody, tenantName);
      }
    }
  } catch (error) {
    console.error("Error notifying member:", error);
  }
}
