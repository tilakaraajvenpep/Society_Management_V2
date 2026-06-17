import express from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

const getFinancialYear = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // Jan is 0, Apr is 3
  if (month >= 3) {
    const nextYr = (year + 1) % 100;
    return `${year}-${nextYr < 10 ? '0' + nextYr : nextYr}`;
  } else {
    const prevYr = year - 1;
    const currYrShort = year % 100;
    return `${prevYr}-${currYrShort < 10 ? '0' + currYrShort : currYrShort}`;
  }
};

router.use(authenticate);

// GET all staff for this tenant
router.get("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const staff = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId, role: "TENANT_ADMIN" },
      select: { 
        id: true, 
        name: true, 
        email: true, 
        mobile: true, 
        designation: true, 
        createdAt: true,
        memberProfile: {
          select: {
            flatNo: true
          }
        }
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(staff);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching staff", error: error.message });
  }
});

// POST create a new staff/office bearer
router.post("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { name, email, mobile, password, designation, flatNo, alsoAddMember } = req.body;
  try {
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    if (!email && !mobile) {
      return res.status(400).json({ message: "Email or mobile number is required" });
    }

    // Constraint check for Email
    if (email) {
      const targetEmail = email.toLowerCase().trim();
      const userExists = await prisma.user.findFirst({
        where: { tenantId: req.user.tenantId, email: targetEmail }
      });
      const memberExists = await prisma.member.findFirst({
        where: { tenantId: req.user.tenantId, email: targetEmail, status: { not: "VACANT" } }
      });
      if (userExists || memberExists) {
        return res.status(400).json({ message: "This email address is already registered in this society. Please use another email." });
      }
    }

    // Constraint check for Mobile
    if (mobile) {
      const targetMobile = mobile.trim();
      const userExists = await prisma.user.findFirst({
        where: { tenantId: req.user.tenantId, mobile: targetMobile }
      });
      const memberExists = await prisma.member.findFirst({
        where: { tenantId: req.user.tenantId, mobile: targetMobile, status: { not: "VACANT" } }
      });
      if (userExists || memberExists) {
        return res.status(400).json({ message: "This mobile number is already registered in this society. Please use another mobile number." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await prisma.$transaction(async (tx) => {
      const staff = await tx.user.create({
        data: {
          name,
          email: email ? email.toLowerCase().trim() : null,
          mobile: mobile ? mobile.trim() : null,
          password: hashedPassword,
          designation,
          role: "TENANT_ADMIN",
          tenantId: req.user.tenantId,
        },
      });

      if (alsoAddMember) {
        const regYear = getFinancialYear(new Date());
        const maintenanceCost = await tx.maintenanceCost.findUnique({
          where: {
            tenantId_financialYear: {
              tenantId: req.user.tenantId,
              financialYear: regYear
            }
          }
        });
        const initialDues = maintenanceCost ? maintenanceCost.amount : 0;

        await tx.member.create({
          data: {
            name,
            email: email ? email.toLowerCase().trim() : null,
            mobile: mobile ? mobile.trim() : "",
            flatNo: flatNo || "OB-TBD",
            address: "",
            outstandingDues: initialDues,
            tenantId: req.user.tenantId,
            userId: staff.id,
            defaultTenure: "MONTHLY",
            registrationYear: regYear,
          }
        });
      }

      return staff;
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "STAFF_CREATED",
        performedBy: req.user.name,
        referenceId: result.id,
        details: `New office bearer added: ${name} (${designation || "Staff"})${alsoAddMember ? " (Also added as member)" : ""}`,
      },
    });

    res.status(201).json({
      id: result.id,
      name: result.name,
      email: result.email,
      mobile: result.mobile,
      designation: result.designation,
      createdAt: result.createdAt
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error creating staff/office bearer", error: error.message });
  }
});

// PATCH update staff details or reset password
router.patch("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { name, email, mobile, designation, password, flatNo, alsoAddMember } = req.body;
  try {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email ? email.toLowerCase().trim() : null;
    if (mobile !== undefined) updateData.mobile = mobile ? mobile.trim() : null;
    if (designation !== undefined) updateData.designation = designation;
    if (password) {
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Constraint check for Email
    if (email) {
      const targetEmail = email.toLowerCase().trim();
      const userExists = await prisma.user.findFirst({
        where: { tenantId: req.user.tenantId, email: targetEmail, id: { not: req.params.id } }
      });
      const memberExists = await prisma.member.findFirst({
        where: { tenantId: req.user.tenantId, email: targetEmail, userId: { not: req.params.id }, status: { not: "VACANT" } }
      });
      if (userExists || memberExists) {
        return res.status(400).json({ message: "This email address is already registered in this society. Please use another email." });
      }
    }

    // Constraint check for Mobile
    if (mobile) {
      const targetMobile = mobile.trim();
      const userExists = await prisma.user.findFirst({
        where: { tenantId: req.user.tenantId, mobile: targetMobile, id: { not: req.params.id } }
      });
      const memberExists = await prisma.member.findFirst({
        where: { tenantId: req.user.tenantId, mobile: targetMobile, userId: { not: req.params.id }, status: { not: "VACANT" } }
      });
      if (userExists || memberExists) {
        return res.status(400).json({ message: "This mobile number is already registered in this society. Please use another mobile number." });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const staff = await tx.user.update({
        where: { id: req.params.id, tenantId: req.user.tenantId, role: "TENANT_ADMIN" },
        data: updateData,
      });

      const existingMember = await tx.member.findUnique({ where: { userId: req.params.id } });
      if (existingMember) {
        await tx.member.update({
          where: { id: existingMember.id },
          data: {
            name: name || undefined,
            email: email ? email.toLowerCase().trim() : undefined,
            mobile: mobile ? mobile.trim() : undefined,
            flatNo: flatNo !== undefined ? (flatNo || "OB-TBD") : undefined,
          }
        });
      } else if (alsoAddMember) {
        const regYear = getFinancialYear(new Date());
        const maintenanceCost = await tx.maintenanceCost.findUnique({
          where: {
            tenantId_financialYear: {
              tenantId: req.user.tenantId,
              financialYear: regYear
            }
          }
        });
        const initialDues = maintenanceCost ? maintenanceCost.amount : 0;
        await tx.member.create({
          data: {
            name: name || staff.name,
            email: email ? email.toLowerCase().trim() : staff.email,
            mobile: mobile ? mobile.trim() : (staff.mobile || ""),
            flatNo: flatNo || "OB-TBD",
            address: "",
            outstandingDues: initialDues,
            tenantId: req.user.tenantId,
            userId: staff.id,
            defaultTenure: "MONTHLY",
            registrationYear: regYear,
          }
        });
      }

      return staff;
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "STAFF_UPDATED",
        performedBy: req.user.name,
        referenceId: result.id,
        details: `Office bearer updated: ${result.name} (${result.designation || "Staff"})`,
      },
    });

    res.json({
      id: result.id,
      name: result.name,
      email: result.email,
      mobile: result.mobile,
      designation: result.designation,
      createdAt: result.createdAt
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error updating staff", error: error.message });
  }
});

// DELETE remove staff member
router.delete("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { removeMember } = req.query;
  try {
    // Prevent deleting self
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    const member = await prisma.member.findUnique({ where: { userId: req.params.id } });

    await prisma.$transaction(async (tx) => {
      if (member) {
        if (removeMember === "true") {
          await tx.member.delete({ where: { id: member.id } });
          await tx.user.delete({ where: { id: req.params.id } });
        } else {
          await tx.member.update({
            where: { id: member.id },
            data: { userId: null }
          });
          await tx.user.delete({ where: { id: req.params.id } });
        }
      } else {
        await tx.user.delete({ where: { id: req.params.id } });
      }
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "STAFF_REMOVED",
        performedBy: req.user.name,
        referenceId: req.params.id,
        details: `Office bearer removed: ${req.params.id}${removeMember === "true" ? " (Also removed as member)" : ""}`,
      },
    });

    res.json({ message: "Staff removed successfully" });
  } catch (error: any) {
    res.status(500).json({ message: "Error removing staff", error: error.message });
  }
});

export default router;
