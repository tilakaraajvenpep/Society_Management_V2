import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { notifyTenantAdmins, notifyMember } from "../utils/notification";

const router = express.Router();

// Raise a new ticket (Members only or Admin on behalf of Member)
router.post("/", authenticate, async (req: any, res) => {
  const { subject, description, priority, memberId } = req.body;
  const tenantId = req.user.tenantId;

  try {
    // Check if forums are enabled for this tenant
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.enableForums) {
      return res.status(403).json({ message: "Helpdesk feature is not enabled for this society" });
    }

    // Determine who is raising the ticket
    let finalMemberId = memberId;
    if (req.user.role === "MEMBER") {
      // If user is a member, they can only raise for themselves
      const member = await prisma.member.findUnique({ where: { userId: req.user.id } });
      if (!member) return res.status(404).json({ message: "Member profile not found" });
      finalMemberId = member.id;
    }

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        description,
        priority: priority || "MEDIUM",
        tenantId,
        memberId: finalMemberId,
      },
      include: { member: true }
    });

    await notifyTenantAdmins({
      tenantId,
      title: "New Helpdesk Ticket",
      message: `A new ticket "${subject}" has been raised by ${ticket.member.name}.`,
      type: "TICKET"
    });

    res.status(201).json(ticket);
  } catch (error) {
    console.error("Error raising ticket:", error);
    res.status(500).json({ message: "Error raising ticket", error });
  }
});

// List tickets (Tenant Admin sees all, Member sees only theirs)
router.get("/", authenticate, async (req: any, res) => {
  const { status, priority } = req.query;
  const tenantId = req.user.tenantId;

  try {
    let where: any = { tenantId };

    if (req.user.role === "MEMBER") {
      const member = await prisma.member.findUnique({ where: { userId: req.user.id } });
      if (!member) return res.status(404).json({ message: "Member profile not found" });
      where.memberId = member.id;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;

    const tickets = await prisma.ticket.findMany({
      where,
      include: { member: true, _count: { select: { comments: true } } },
      orderBy: { createdAt: "desc" }
    });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets", error });
  }
});

// Get ticket details and comments
router.get("/:id", authenticate, async (req: any, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id },
      include: {
        member: true,
        comments: {
          include: {
            user: { select: { name: true, role: true } },
            member: { select: { name: true } }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!ticket || ticket.tenantId !== req.user.tenantId) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Security: Member can only see their own tickets
    if (req.user.role === "MEMBER") {
      const member = await prisma.member.findUnique({ where: { userId: req.user.id } });
      if (!member || ticket.memberId !== member.id) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: "Error fetching ticket details", error });
  }
});

// Update ticket status (Admin has full control, Member can only close their own)
router.patch("/:id/status", authenticate, async (req: any, res) => {
  const { status } = req.body;
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket || ticket.tenantId !== req.user.tenantId) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Permissions
    if (req.user.role === "MEMBER") {
      const member = await prisma.member.findUnique({ where: { userId: req.user.id } });
      if (!member || ticket.memberId !== member.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      // Member can only change to CLOSED or RESOLVED if allowed, but usually just CLOSED
      if (status !== "CLOSED") {
        return res.status(403).json({ message: "Members can only close tickets" });
      }
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status }
    });

    await notifyMember({
      tenantId: req.user.tenantId,
      memberId: ticket.memberId,
      title: "Ticket Status Updated",
      message: `Your ticket "${ticket.subject}" status has been updated to "${status}".`,
      type: "TICKET"
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error });
  }
});

// Add a comment to a ticket
router.post("/:id/comments", authenticate, async (req: any, res) => {
  const { content } = req.body;
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket || ticket.tenantId !== req.user.tenantId) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    let memberId = null;
    let userId = null;

    if (req.user.role === "MEMBER") {
      const member = await prisma.member.findUnique({ where: { userId: req.user.id } });
      if (!member || ticket.memberId !== member.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      memberId = member.id;
    } else {
      userId = req.user.id;
    }

    const comment = await prisma.ticketComment.create({
      data: {
        content,
        ticketId: req.params.id,
        userId,
        memberId
      },
      include: {
        user: { select: { name: true, role: true } },
        member: { select: { name: true } }
      }
    });

    if (userId) {
      await notifyMember({
        tenantId: ticket.tenantId,
        memberId: ticket.memberId,
        title: "New Ticket Comment",
        message: `An admin commented on your ticket "${ticket.subject}": "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        type: "TICKET"
      });
    } else if (memberId) {
      const commenter = await prisma.member.findUnique({ where: { id: memberId }, select: { name: true } });
      await notifyTenantAdmins({
        tenantId: ticket.tenantId,
        title: "New Ticket Comment",
        message: `${commenter?.name || "A member"} commented on ticket "${ticket.subject}": "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
        type: "TICKET"
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: "Error adding comment", error });
  }
});

// Delete a ticket (Tenant Admin only)
router.delete("/:id", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
    if (!ticket || ticket.tenantId !== req.user.tenantId) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    await prisma.ticket.delete({ where: { id: req.params.id } });
    res.json({ message: "Ticket and all discussions deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting ticket", error });
  }
});

export default router;
