import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { createNotification } from "../utils/notification";

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

// Broadcast/Send announcement (Tenant Admin only)
router.post("/", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { title, message, type, targetUserId } = req.body;
  const tenantId = req.user.tenantId;

  if (!title || !message) {
    return res.status(400).json({ message: "Title and message are required" });
  }

  try {
    if (targetUserId) {
      // Send to a single user
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
    } else {
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
    }
  } catch (error) {
    console.error("Error sending notification:", error);
    res.status(500).json({ message: "Error sending notification", error });
  }
});

export default router;
