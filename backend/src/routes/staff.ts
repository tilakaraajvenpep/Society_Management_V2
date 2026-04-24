import express from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

router.use(authenticate);

// GET all staff for this tenant
router.get("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId, role: "TENANT_ADMIN" },
      select: { id: true, name: true, email: true, mobile: true, designation: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching staff", error: error.message });
  }
});

// POST create a new staff/office bearer
router.post("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { name, email, mobile, password, designation } = req.body;
  try {
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!email && !mobile) {
      return res.status(400).json({ message: "Email or mobile number is required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const staff = await prisma.user.create({
      data: {
        name,
        email: email || undefined,
        mobile: mobile || undefined,
        password: hashedPassword,
        designation,
        role: "TENANT_ADMIN",
        tenantId: req.user.tenantId,
      },
      select: { id: true, name: true, email: true, mobile: true, designation: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "STAFF_CREATED",
        performedBy: req.user.name,
        referenceId: staff.id,
        details: `New office bearer added: ${name} (${designation || "Staff"})`,
      },
    });

    res.status(201).json(staff);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Email or mobile already in use" });
    }
    res.status(500).json({ message: "Error creating staff", error: error.message });
  }
});

// PATCH update staff details or reset password
router.patch("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { name, email, mobile, designation, password } = req.body;
  try {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile) updateData.mobile = mobile;
    if (designation !== undefined) updateData.designation = designation;
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      updateData.password = await bcrypt.hash(password, 10);
    }

    const staff = await prisma.user.update({
      where: { id: req.params.id, tenantId: req.user.tenantId, role: "TENANT_ADMIN" },
      data: updateData,
      select: { id: true, name: true, email: true, mobile: true, designation: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "STAFF_UPDATED",
        performedBy: req.user.name,
        referenceId: staff.id,
        details: `Office bearer updated: ${staff.name} (${staff.designation || "Staff"})`,
      },
    });

    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating staff", error: error.message });
  }
});

// DELETE remove staff member
router.delete("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    // Prevent deleting self
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    const staff = await prisma.user.delete({
      where: { id: req.params.id, tenantId: req.user.tenantId, role: "TENANT_ADMIN" },
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "STAFF_REMOVED",
        performedBy: req.user.name,
        referenceId: req.params.id,
        details: `Office bearer removed: ${staff.name}`,
      },
    });

    res.json({ message: "Staff removed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error removing staff", error: error.message });
  }
});

export default router;
