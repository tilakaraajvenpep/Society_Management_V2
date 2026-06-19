import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { createNotification, notifyMember } from "../utils/notification";

const router = express.Router();

// Get notifications for current user
router.get("/", authenticate, async (req: any, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user.id,
        tenantId: req.user.tenantId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    res.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ message: "Error fetching notifications", error });
  }
});

// Mark all notifications as read
router.patch("/read-all", authenticate, async (req: any, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    res.status(500).json({ message: "Error marking notifications as read", error });
  }
});

// Mark specific notification as read
router.patch("/:id/read", authenticate, async (req: any, res) => {
  const { id } = req.params;
  try {
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== req.user.id || notification.tenantId !== req.user.tenantId) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Error marking notification as read", error });
  }
});

// Check if a specific member has outstanding dues (pre-send validation for admin)
router.get("/check-member-dues/:memberId", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { memberId } = req.params;
  const tenantId = req.user.tenantId;

  try {
    const member = await prisma.member.findUnique({
      where: { id: memberId, tenantId },
      select: {
        id: true,
        name: true,
        flatNo: true,
        outstandingDues: true,
        paidUntil: true,
        status: true,
      },
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    const hasDues = member.outstandingDues > 0;
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const isPaidUpToDate = member.paidUntil
      ? new Date(member.paidUntil) >= currentMonthStart
      : false;

    res.json({
      memberId: member.id,
      memberName: member.name,
      flatNo: member.flatNo,
      outstandingDues: member.outstandingDues,
      paidUntil: member.paidUntil,
      hasDues,
      isPaidUpToDate,
      status: member.status,
    });
  } catch (error) {
    console.error("Error checking member dues:", error);
    res.status(500).json({ message: "Error checking member dues", error });
  }
});

// Send monthly dues reminders to all members with outstanding dues
// Can be triggered manually by admin or called from the scheduler
router.post("/send-monthly-dues-reminders", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const tenantId = req.user.tenantId;

  try {
    const membersWithDues = await prisma.member.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        outstandingDues: { gt: 0 },
        OR: [
          { userId: { not: null } },
          { secondaryUserId: { not: null } }
        ]
      },
      select: {
        id: true,
        name: true,
        flatNo: true,
        outstandingDues: true,
        userId: true,
        secondaryUserId: true,
      },
    });

    if (membersWithDues.length === 0) {
      return res.json({
        message: "All members are paid up! No dues reminders needed.",
        count: 0,
      });
    }

    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "long" });
    const year = now.getFullYear();

    const notificationsData: any[] = [];
    for (const m of membersWithDues) {
      const template = {
        tenantId,
        title: `Monthly Dues Reminder — ${monthName} ${year}`,
        message: `Dear ${m.name}, your maintenance dues of ₹${m.outstandingDues.toLocaleString("en-IN")} for Flat ${m.flatNo} are pending. Please pay at the earliest to avoid inconvenience. Contact the society office if you have any questions.`,
        type: "DUES_REMINDER",
      };
      if (m.userId) {
        notificationsData.push({ ...template, userId: m.userId });
      }
      if (m.secondaryUserId) {
        notificationsData.push({ ...template, userId: m.secondaryUserId });
      }
    }

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
    }

    await prisma.auditLog.create({
      data: {
        tenantId,
        actionType: "DUES_REMINDER_SENT",
        performedBy: req.user.name,
        details: `Monthly dues reminder sent to ${membersWithDues.length} member(s) with outstanding dues for ${monthName} ${year}.`,
      },
    });

    return res.status(201).json({
      message: `Dues reminder sent to ${membersWithDues.length} member(s) with outstanding dues.`,
      count: membersWithDues.length,
      members: membersWithDues.map((m) => ({
        name: m.name,
        flatNo: m.flatNo,
        dues: m.outstandingDues,
      })),
    });
  } catch (error) {
    console.error("Error sending monthly dues reminders:", error);
    res.status(500).json({ message: "Error sending dues reminders", error });
  }
});

// Broadcast/Send announcement (Tenant Admin only)
// Supports: targetMemberId, targetUserId, or broadcast to ALL
router.post("/", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { title, message, type, targetUserId, targetMemberId } = req.body;
  const tenantId = req.user.tenantId;

  if (!title || !message) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  try {
    // Send to a specific member by memberId (uses their linked user account)
    if (targetMemberId) {
      const member = await prisma.member.findUnique({
        where: { id: targetMemberId, tenantId },
        select: { userId: true, secondaryUserId: true, name: true, flatNo: true }
      });

      if (!member) {
        return res.status(404).json({ message: "Target member not found in this society" });
      }
      if (!member.userId && !member.secondaryUserId) {
        return res.status(400).json({
          message: `${member.name} (Flat ${member.flatNo}) does not have a member portal account. Notification cannot be sent.`,
        });
      }

      await notifyMember({
        tenantId,
        memberId: targetMemberId,
        title,
        message,
        type: type || "ANNOUNCEMENT",
      });

      return res.status(201).json({ message: "Announcement sent to member contacts." });
    }

    // Send to a specific user by userId
    if (targetUserId) {
      const user = await prisma.user.findUnique({
        where: { id: targetUserId, tenantId },
      });

      if (!user) {
        return res.status(404).json({ message: "Target user not found in this society" });
      }

      const notification = await createNotification({
        tenantId,
        userId: targetUserId,
        title,
        message,
        type: type || "ANNOUNCEMENT",
      });

      return res.status(201).json(notification);
    }

    // Broadcast to ALL users in the tenant
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });

    const notificationsData = users.map((u) => ({
      tenantId,
      userId: u.id,
      title,
      message,
      type: type || "ANNOUNCEMENT",
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData,
      });
    }

    return res.status(201).json({ message: `Broadcasted to ${users.length} users` });
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ message: "Error sending notification", error });
  }
});

export default router;
