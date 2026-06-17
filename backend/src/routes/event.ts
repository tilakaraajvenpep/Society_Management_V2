import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

// Get all events (accessible by both Tenant Admin and Members)
router.get("/", authenticate, async (req: any, res) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        tenantId: req.user.tenantId,
      },
      orderBy: {
        eventDate: "asc",
      },
    });
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ message: "Error fetching events", error });
  }
});

// Create a new event (Tenant Admin only)
router.post("/", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { title, description, eventDate, location } = req.body;
  const tenantId = req.user.tenantId;

  if (!title || !description || !eventDate) {
    return res.status(400).json({ message: "Title, description and eventDate are required" });
  }

  try {
    const event = await prisma.event.create({
      data: {
        tenantId,
        title,
        description,
        eventDate: new Date(eventDate),
        location: location || null,
      },
    });

    // Broadcast a notification to all users in this tenant
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: { id: true },
    });

    const formattedDate = new Date(eventDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const notificationsData = users.map((u) => ({
      tenantId,
      userId: u.id,
      title: `Upcoming Event: ${title}`,
      message: `A new event has been scheduled for ${formattedDate} at ${location || "the society premises"}. Details: ${description}`,
      type: "EVENT",
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData,
      });
    }

    res.status(201).json(event);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ message: "Error creating event", error });
  }
});

// Update an event (Tenant Admin only)
router.put("/:id", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { id } = req.params;
  const { title, description, eventDate, location } = req.body;
  const tenantId = req.user.tenantId;

  if (!title || !description || !eventDate) {
    return res.status(400).json({ message: "Title, description and eventDate are required" });
  }

  try {
    const existing = await prisma.event.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        eventDate: new Date(eventDate),
        location: location || null,
      },
    });

    res.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ message: "Error updating event", error });
  }
});

// Delete an event (Tenant Admin only)
router.delete("/:id", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;

  try {
    const existing = await prisma.event.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Event not found" });
    }

    await prisma.event.delete({
      where: { id },
    });

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ message: "Error deleting event", error });
  }
});

export default router;
