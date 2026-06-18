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

const getStartYear = (fy: string) => {
  const match = fy.trim().match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
};

const calculateTotalMaintenanceForMember = (
  registrationYear: string,
  useCommonMaintenance: boolean,
  residenceType: string,
  bhk: string,
  costs: any[]
): number => {
  const regStartYear = getStartYear(registrationYear);
  if (!regStartYear) return 0;

  const uniqueYears = Array.from(new Set(costs.map(c => c.financialYear)))
    .filter(fy => getStartYear(fy) >= regStartYear);

  let total = 0;
  for (const fy of uniqueYears) {
    let costResType = "COMMON";
    let costBhk = "COMMON";
    if (!useCommonMaintenance) {
      costResType = residenceType || "COMMON";
      costBhk = bhk || "COMMON";
    }

    let cost = costs.find(c =>
      c.financialYear === fy &&
      c.residenceType === costResType &&
      c.bhk === costBhk
    );

    if (!cost && (costResType !== "COMMON" || costBhk !== "COMMON")) {
      cost = costs.find(c =>
        c.financialYear === fy &&
        c.residenceType === "COMMON" &&
        c.bhk === "COMMON"
      );
    }

    if (cost) {
      total += cost.amount;
    }
  }
  return total;
};


router.use(authenticate);

// Member Profile (for logged in members)
router.get("/profile", authorize(["MEMBER"]), async (req: any, res) => {
  try {
    const member = await prisma.member.findUnique({
      where: { userId: req.user.id },
      include: { 
        tenant: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 50 // Limit to last 50 receipts
        },
        subscriptions: {
          orderBy: { dueDate: 'desc' }
        }
      }
    });
    
    if (!member) {
      return res.status(404).json({ message: "Member profile not found" });
    }
    
    res.json(member);
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error });
  }
});

// Update Member Profile (for logged in members)
router.patch("/profile", authorize(["MEMBER"]), async (req: any, res) => {
  const { name, email, mobile, password, photoUrl } = req.body;
  try {
    const member = await prisma.member.findUnique({
      where: { userId: req.user.id }
    });

    if (!member) {
      return res.status(404).json({ message: "Member profile not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update user details
      const userUpdateData: any = {};
      if (name) {
        userUpdateData.name = name;
      }
      if (email !== undefined) {
        const targetEmail = email ? email.toLowerCase().trim() : null;
        if (targetEmail) {
          const existingUser = await tx.user.findFirst({
            where: {
              email: targetEmail,
              tenantId: req.user.tenantId,
              id: { not: req.user.id }
            }
          });
          if (existingUser) {
            throw new Error("Email address is already registered for another member in this society.");
          }
        }
        userUpdateData.email = targetEmail;
      }
      if (mobile) {
        // Check if mobile is unique per tenant
        const existingUser = await tx.user.findFirst({
          where: {
            mobile,
            tenantId: req.user.tenantId,
            id: { not: req.user.id }
          }
        });
        if (existingUser) {
          throw new Error("Mobile number is already registered for another member in this society.");
        }
        userUpdateData.mobile = mobile;
      }
      if (password) {
        userUpdateData.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(userUpdateData).length > 0) {
        await tx.user.update({
          where: { id: req.user.id },
          data: userUpdateData
        });
      }

      // 2. Update member details
      const memberUpdateData: any = {};
      if (name) {
        memberUpdateData.name = name;
      }
      if (email !== undefined) {
        memberUpdateData.email = email ? email.toLowerCase().trim() : null;
      }
      if (mobile) {
        memberUpdateData.mobile = mobile;
      }
      if (photoUrl !== undefined) {
        memberUpdateData.photoUrl = photoUrl;
      }

      const updatedMember = await tx.member.update({
        where: { id: member.id },
        data: memberUpdateData
      });

      return updatedMember;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: error.message || "Error updating profile" });
  }
});

// Tenant Admin only
router.get("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const members = await prisma.member.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(members);
});

router.post("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { name, email, mobile, flatNo, address, outstandingDues, password, enableLogin, loginMethod, defaultTenure, paidUntil, initialPaymentAmount, initialPaymentMode, initialPaymentNotes, photoUrl, idProofUrl, registrationYear, initialPaymentDate } = req.body;
  try {
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

    const result = await prisma.$transaction(async (tx) => {
      let userId = undefined;
      
      if (enableLogin && password) {
        const targetEmail = (loginMethod === "EMAIL" || loginMethod === "BOTH" || !loginMethod) ? (email?.toLowerCase().trim() || null) : null;
        const targetMobile = (loginMethod === "MOBILE" || loginMethod === "BOTH" || !loginMethod) ? (mobile?.trim() || null) : null;

        console.log("Checking existing user (isolated) for:", { email: targetEmail, mobile: targetMobile, tenantId: req.user.tenantId });
        // Check if user already exists IN THIS TENANT ONLY
        let existingUser = null;
        if (targetEmail) {
          existingUser = await tx.user.findUnique({ 
            where: { 
              email_tenantId: { 
                email: targetEmail, 
                tenantId: req.user.tenantId 
              } 
            } 
          });
        }
        if (!existingUser && targetMobile) {
          existingUser = await tx.user.findUnique({ 
            where: { 
              mobile_tenantId: { 
                mobile: targetMobile, 
                tenantId: req.user.tenantId 
              } 
            } 
          });
        }

        if (existingUser) {
          userId = existingUser.id;
          // Update credentials on existing user to match
          await tx.user.update({
            where: { id: userId },
            data: {
              email: targetEmail,
              mobile: targetMobile
            }
          });
        } else {
          const hashedPassword = await bcrypt.hash(password, 10);
          const user = await tx.user.create({
            data: {
              name,
              email: targetEmail,
              mobile: targetMobile,
              password: hashedPassword,
              role: "MEMBER",
              tenantId: req.user.tenantId,
            }
          });
          userId = user.id;
        }
      }

      const { residenceType, bhk, useCommonMaintenance } = req.body;
      const regYear = registrationYear?.trim() || getFinancialYear(new Date());

      // Get all configured maintenance costs for this tenant
      const allCosts = await tx.maintenanceCost.findMany({
        where: { tenantId: req.user.tenantId }
      });

      const actualUseCommon = useCommonMaintenance !== undefined ? (useCommonMaintenance === true || useCommonMaintenance === 'true') : true;
      const totalApplicableDues = calculateTotalMaintenanceForMember(
        regYear,
        actualUseCommon,
        residenceType || "COMMON",
        bhk || "COMMON",
        allCosts
      );

      let initialDues = outstandingDues ? parseFloat(outstandingDues.toString()) : 0;
      initialDues += totalApplicableDues;


      const member = await tx.member.create({
        data: {
          name,
          email,
          mobile,
          flatNo,
          address,
          outstandingDues: initialDues,
          tenantId: req.user.tenantId,
          userId,
          defaultTenure: defaultTenure || "MONTHLY",
          paidUntil: paidUntil ? new Date(paidUntil) : null,
          photoUrl,
          idProofUrl,
          registrationYear: regYear,
          residenceType: residenceType || "COMMON",
          bhk: bhk || "COMMON",
          useCommonMaintenance: actualUseCommon,
        },
      });

      // Handle initial payment (Corpus Fund, Setup Fee, etc)
      if (initialPaymentAmount && parseFloat(initialPaymentAmount) > 0) {
        const pCount = await tx.payment.count({ where: { tenantId: req.user.tenantId } });
        const receiptNumber = `REC-${(pCount + 1).toString().padStart(4, '0')}`;
        const mode = initialPaymentMode || 'CASH';
        
        await tx.payment.create({
          data: {
            memberId: member.id,
            amount: parseFloat(initialPaymentAmount.toString()),
            mode: mode as any,
            notes: initialPaymentNotes || "Onboarding Setup / Corpus Fund",
            tenantId: req.user.tenantId,
            collectedById: req.user.id,
            receiptNumber,
            handoverStatus: mode === "CASH" ? "WITH_COLLECTOR" : "TRANSFERRED_TO_BANK",
            periodLabel: "Initial Onboarding Fee",
            paymentDate: initialPaymentDate ? new Date(initialPaymentDate) : undefined,
          }
        });

        if (mode === "CASH") {
          await tx.cashBalance.upsert({
            where: { userId: req.user.id },
            update: { balance: { increment: parseFloat(initialPaymentAmount.toString()) } },
            create: { userId: req.user.id, balance: parseFloat(initialPaymentAmount.toString()) },
          });
        }
      }

      return member;
    });

    res.json(result);
  } catch (error) {
    console.error("Error adding member:", error);
    res.status(500).json({ message: "Error adding member", error });
  }
});

router.post("/bulk", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { members } = req.body;
  try {
    const result = await prisma.member.createMany({
      data: members.map((m: any) => ({
        name: m.name,
        email: m.email || "",
        mobile: m.mobile,
        flatNo: m.flatNo,
        address: m.address || "",
        outstandingDues: m.outstandingDues ? parseFloat(m.outstandingDues.toString()) : 0,
        tenantId: req.user.tenantId,
      }))
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "MEMBER_BULK_IMPORT",
        performedBy: req.user.name,
        details: `Imported ${result.count} members via bulk upload`,
      }
    });

    res.json({ message: `${result.count} members imported successfully`, count: result.count });
  } catch (error) {
    res.status(500).json({ message: "Error importing members", error });
  }
});

router.patch("/:id/vacant", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { removeStaff } = req.query;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const member = await tx.member.findUnique({ 
        where: { id: req.params.id, tenantId: req.user.tenantId },
        include: { user: true }
      });
      if (!member) throw new Error("Member not found");
      
      if (member.userId) {
        const isStaff = member.user && member.user.role === "TENANT_ADMIN";
        if (isStaff) {
          if (removeStaff === "true") {
            await tx.user.delete({ where: { id: member.userId } });
          } else {
            // Keep staff user, just unlink it from Member
          }
        } else {
          // Regular member - always delete user
          await tx.user.delete({ where: { id: member.userId } });
        }
      }
      return await tx.member.update({
        where: { id: req.params.id },
        data: { status: "VACANT", userId: null }
      });
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Error marking member as vacant", error: error.message });
  }
});

router.patch("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { name, email, mobile, flatNo, address, outstandingDues, status, password, enableLogin, loginMethod, defaultTenure, paidUntil, photoUrl, idProofUrl, registrationYear } = req.body;
  try {
    // Constraint check for Email
    if (email) {
      const targetEmail = email.toLowerCase().trim();
      const userExists = await prisma.user.findFirst({
        where: { tenantId: req.user.tenantId, email: targetEmail }
      });
      const memberExists = await prisma.member.findFirst({
        where: { tenantId: req.user.tenantId, email: targetEmail, id: { not: req.params.id }, status: { not: "VACANT" } }
      });
      const currentMember = await prisma.member.findUnique({ where: { id: req.params.id } });
      if ((userExists && userExists.id !== currentMember?.userId) || memberExists) {
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
        where: { tenantId: req.user.tenantId, mobile: targetMobile, id: { not: req.params.id }, status: { not: "VACANT" } }
      });
      const currentMember = await prisma.member.findUnique({ where: { id: req.params.id } });
      if ((userExists && userExists.id !== currentMember?.userId) || memberExists) {
        return res.status(400).json({ message: "This mobile number is already registered in this society. Please use another mobile number." });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const currentMember = await tx.member.findUnique({
        where: { id: req.params.id, tenantId: req.user.tenantId },
        include: { user: true }
      });

      if (!currentMember) throw new Error("Member not found");

      let userId = currentMember.userId;

      if (enableLogin) {
        const targetEmail = (loginMethod === "EMAIL" || loginMethod === "BOTH" || !loginMethod) ? (email?.toLowerCase().trim() || null) : null;
        const targetMobile = (loginMethod === "MOBILE" || loginMethod === "BOTH" || !loginMethod) ? (mobile?.trim() || null) : null;

        if (userId) {
          // Update existing user
          const updateData: any = { name, email: targetEmail, mobile: targetMobile };
          if (password) {
            updateData.password = await bcrypt.hash(password, 10);
          }
          await tx.user.update({
            where: { id: userId },
            data: updateData
          });
        } else if (password) {
          // Create new user
          const hashedPassword = await bcrypt.hash(password, 10);
          const user = await tx.user.create({
            data: {
              name,
              email: targetEmail,
              mobile: targetMobile,
              password: hashedPassword,
              role: "MEMBER",
              tenantId: req.user.tenantId,
            }
          });
          userId = user.id;
        }
      } else {
        if (userId) {
          await tx.member.update({
            where: { id: req.params.id },
            data: { userId: null }
          });
          await tx.user.delete({ where: { id: userId } });
          userId = null;
        }
      }

      let finalOutstandingDues = outstandingDues !== undefined ? parseFloat(outstandingDues.toString()) : undefined;

      const { residenceType, bhk, useCommonMaintenance } = req.body;

      // Get all configured maintenance costs for this tenant
      const allCosts = await tx.maintenanceCost.findMany({
        where: { tenantId: req.user.tenantId }
      });

      // Calculate old total maintenance dues
      const oldRegYear = currentMember.registrationYear || "";
      const oldUseCommon = currentMember.useCommonMaintenance;
      const oldResType = currentMember.residenceType || "COMMON";
      const oldBhk = currentMember.bhk || "COMMON";

      const oldMaintenanceTotal = calculateTotalMaintenanceForMember(
        oldRegYear,
        oldUseCommon,
        oldResType,
        oldBhk,
        allCosts
      );

      // Calculate new total maintenance dues
      const nextRegYear = registrationYear !== undefined ? registrationYear : currentMember.registrationYear;
      const nextUseCommon = useCommonMaintenance !== undefined ? (useCommonMaintenance === true || useCommonMaintenance === 'true') : currentMember.useCommonMaintenance;
      const nextResType = residenceType !== undefined ? residenceType : currentMember.residenceType;
      const nextBhk = bhk !== undefined ? bhk : currentMember.bhk;

      const newMaintenanceTotal = calculateTotalMaintenanceForMember(
        nextRegYear || "",
        nextUseCommon,
        nextResType || "COMMON",
        nextBhk || "COMMON",
        allCosts
      );

      const duesAdjustment = newMaintenanceTotal - oldMaintenanceTotal;
      if (duesAdjustment !== 0) {
        if (finalOutstandingDues !== undefined) {
          finalOutstandingDues += duesAdjustment;
        } else {
          finalOutstandingDues = currentMember.outstandingDues + duesAdjustment;
        }
      }

      const member = await tx.member.update({
        where: { id: req.params.id },
        data: {
          name,
          email,
          mobile,
          flatNo,
          address,
          outstandingDues: finalOutstandingDues,
          status,
          userId,
          defaultTenure: defaultTenure || undefined,
          paidUntil: req.body.hasOwnProperty('paidUntil') ? (paidUntil ? new Date(paidUntil) : null) : undefined,
          photoUrl: photoUrl !== undefined ? photoUrl : undefined,
          idProofUrl: idProofUrl !== undefined ? idProofUrl : undefined,
          registrationYear: registrationYear || undefined,
          residenceType: residenceType !== undefined ? residenceType : undefined,
          bhk: bhk !== undefined ? bhk : undefined,
          useCommonMaintenance: useCommonMaintenance !== undefined ? (useCommonMaintenance === true || useCommonMaintenance === 'true') : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          actionType: "MEMBER_UPDATED",
          performedBy: req.user.name,
          referenceId: member.id,
          details: `Updated details for member ${member.name} (${member.flatNo}). Login ${enableLogin ? 'Enabled' : 'No Change'}.`,
        }
      });

      return member;
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error updating member:", error);
    res.status(500).json({ message: error.message || "Error updating member", error });
  }
});

export default router;
