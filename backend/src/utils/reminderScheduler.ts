import nodemailer from "nodemailer";
import prisma from "./prisma";
import { createNotification } from "./notification";

// Helper function to send email via SMTP if configured, otherwise logs to console
async function sendReminderEmail(toEmail: string, memberName: string, duesAmount: number, tenantName: string) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const emailSubject = `Pending Dues Alert - ${tenantName}`;
  const emailBody = `
Dear ${memberName},

This is a friendly reminder that you have outstanding dues of ₹${duesAmount} for your apartment in ${tenantName}.

Please clear your dues as soon as possible. If you have already paid, please ignore this email.

Best regards,
Management Committee
${tenantName}
  `;

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
        subject: emailSubject,
        text: emailBody
      });
      console.log(`[Email Reminder] Sent successfully to ${toEmail}`);
    } catch (error: any) {
      console.error(`[Email Reminder] Failed to send to ${toEmail}:`, error.message);
    }
  } else {
    console.log(`
=========================================
[MOCK EMAIL REMINDER] (SMTP Not Configured)
To: ${toEmail}
Subject: ${emailSubject}
Body:
${emailBody}
=========================================
    `);
  }
}

export async function runReminderJob() {
  console.log(`[Reminder Job] Executing dues and payment reminder job...`);
  try {
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" }
    });

    const now = new Date();

    for (const tenant of tenants) {
      const { 
        id: tenantId, 
        name: tenantName, 
        enableMonthlyReminder, 
        monthlyReminderCount, 
        monthlyReminderInterval, 
        enableOverdueReminder, 
        overdueReminderInterval 
      } = tenant;

      if (!enableMonthlyReminder && !enableOverdueReminder) {
        continue;
      }

      // Fetch active members
      const members = await prisma.member.findMany({
        where: { tenantId, status: "ACTIVE" }
      });

      for (const member of members) {
        let updatedFields: any = {};

        // 1. Monthly Reminder check
        if (enableMonthlyReminder) {
          // If they have paid and payment is recorded for this month, stop sending monthly reminder notification
          const hasPaidCurrentMonth = member.paidUntil && new Date(member.paidUntil) >= new Date(now.getFullYear(), now.getMonth(), 1);
          
          if (!hasPaidCurrentMonth) {
            let count = member.monthlyReminderSentCount;
            let lastSent = member.lastMonthlyReminderSentAt;

            // Check if we are in a new calendar month compared to the last sent date
            const isNewMonth = !lastSent || (
              now.getFullYear() !== lastSent.getFullYear() ||
              now.getMonth() !== lastSent.getMonth()
            );

            if (isNewMonth) {
              count = 0;
            }

            if (count < monthlyReminderCount) {
              const daysSinceLastSent = lastSent ? (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
              if (daysSinceLastSent >= monthlyReminderInterval) {
                // Raise notification
                if (member.userId) {
                  await createNotification({
                    tenantId,
                    userId: member.userId,
                    title: "Monthly Maintenance Reminder",
                    message: `Dear ${member.name}, please remember to pay your monthly maintenance fee for this period.`,
                    type: "PAYMENT"
                  });
                }
                updatedFields.lastMonthlyReminderSentAt = now;
                updatedFields.monthlyReminderSentCount = count + 1;
              }
            }
          }
        }

        // 2. Overdue Dues Reminder check
        if (enableOverdueReminder && member.outstandingDues > 0) {
          const lastOverdueSent = member.lastOverdueReminderSentAt;
          const daysSinceLastOverdue = lastOverdueSent ? (now.getTime() - lastOverdueSent.getTime()) / (1000 * 60 * 60 * 24) : Infinity;

          if (daysSinceLastOverdue >= overdueReminderInterval) {
            // Raise notification
            if (member.userId) {
              await createNotification({
                tenantId,
                userId: member.userId,
                title: "Overdue Maintenance Dues",
                message: `Dear ${member.name}, you have outstanding dues of ₹${member.outstandingDues}. Please clear them as soon as possible.`,
                type: "OVERDUE"
              });
            }

            // If they have dues from subsequent months (meaning their paidUntil is in the past by more than 1 month, or they have outstanding dues), send email
            if (member.email) {
              let subsequentMonthDue = false;
              if (member.paidUntil) {
                const diffTime = now.getTime() - new Date(member.paidUntil).getTime();
                const diffDays = diffTime / (1000 * 60 * 60 * 24);
                // If the paidUntil date is older than 30 days, they owe for subsequent/previous months
                if (diffDays > 30) {
                  subsequentMonthDue = true;
                }
              } else {
                subsequentMonthDue = true;
              }

              if (subsequentMonthDue) {
                await sendReminderEmail(member.email, member.name, member.outstandingDues, tenantName);
              }
            }

            updatedFields.lastOverdueReminderSentAt = now;
          }
        }

        // If we updated any fields, write to DB
        if (Object.keys(updatedFields).length > 0) {
          await prisma.member.update({
            where: { id: member.id },
            data: updatedFields
          });
        }
      }
    }
  } catch (error: any) {
    console.error(`[Reminder Job] Error during execution:`, error.message);
  }
}
