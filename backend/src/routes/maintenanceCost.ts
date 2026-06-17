import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

router.use(authenticate);

// GET all configured maintenance costs for the tenant
router.get("/", authorize(["TENANT_ADMIN", "MEMBER"]), async (req: any, res) => {
  try {
    const costs = await prisma.maintenanceCost.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { financialYear: "asc" }
    });
    res.json(costs);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching maintenance costs", error: error.message });
  }
});

// POST setup or update annual maintenance cost (Upsert)
router.post("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { financialYear, amount, residenceType, bhk } = req.body;
  
  if (!financialYear || amount === undefined) {
    return res.status(400).json({ message: "Financial year and amount are required" });
  }

  const parsedAmount = parseFloat(amount.toString());
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ message: "Amount must be a positive number" });
  }

  const targetResType = residenceType || "COMMON";
  const targetBhk = bhk || "COMMON";

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find existing cost for difference calculation
      const existingCost = await tx.maintenanceCost.findUnique({
        where: {
          tenantId_financialYear_residenceType_bhk: {
            tenantId: req.user.tenantId,
            financialYear: financialYear.trim(),
            residenceType: targetResType,
            bhk: targetBhk
          }
        }
      });

      const oldAmount = existingCost ? existingCost.amount : 0;
      const diff = parsedAmount - oldAmount;

      const cost = await tx.maintenanceCost.upsert({
        where: {
          tenantId_financialYear_residenceType_bhk: {
            tenantId: req.user.tenantId,
            financialYear: financialYear.trim(),
            residenceType: targetResType,
            bhk: targetBhk
          }
        },
        update: {
          amount: parsedAmount
        },
        create: {
          tenantId: req.user.tenantId,
          financialYear: financialYear.trim(),
          amount: parsedAmount,
          residenceType: targetResType,
          bhk: targetBhk
        }
      });

      if (diff !== 0) {
        let memberFilter: any = {
          tenantId: req.user.tenantId,
          registrationYear: financialYear.trim()
        };

        if (targetResType === "COMMON" && targetBhk === "COMMON") {
          // If common is updated, we update members who either:
          // 1. Have useCommonMaintenance = true
          // 2. Or residenceType = "COMMON"
          memberFilter = {
            ...memberFilter,
            OR: [
              { useCommonMaintenance: true },
              { residenceType: "COMMON" }
            ]
          };
        } else {
          // If specific flat/villa bhk is updated, we update members who:
          // 1. Have useCommonMaintenance = false
          // 2. And residenceType = targetResType
          // 3. And bhk = targetBhk
          memberFilter = {
            ...memberFilter,
            useCommonMaintenance: false,
            residenceType: targetResType,
            bhk: targetBhk
          };
        }

        await tx.member.updateMany({
          where: memberFilter,
          data: {
            outstandingDues: {
              increment: diff
            }
          }
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          actionType: "MAINTENANCE_COST_SETUP",
          performedBy: req.user.name,
          referenceId: cost.id,
          details: `Configured annual maintenance cost for FY ${financialYear} (${targetResType} - BHK ${targetBhk}) as ₹${parsedAmount}. Adjusted dues for corresponding members by diff of ₹${diff}`
        }
      });

      return cost;
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Error setting up maintenance cost", error: error.message });
  }
});

// DELETE a configured maintenance cost
router.delete("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const cost = await tx.maintenanceCost.findUnique({
        where: {
          id: req.params.id,
          tenantId: req.user.tenantId
        }
      });

      if (!cost) {
        throw new Error("Maintenance cost configuration not found");
      }

      await tx.maintenanceCost.delete({
        where: { id: req.params.id }
      });

      // Decrease outstanding dues of corresponding members
      let memberFilter: any = {
        tenantId: req.user.tenantId,
        registrationYear: cost.financialYear
      };

      if (cost.residenceType === "COMMON" && cost.bhk === "COMMON") {
        memberFilter = {
          ...memberFilter,
          OR: [
            { useCommonMaintenance: true },
            { residenceType: "COMMON" }
          ]
        };
      } else {
        memberFilter = {
          ...memberFilter,
          useCommonMaintenance: false,
          residenceType: cost.residenceType,
          bhk: cost.bhk
        };
      }

      await tx.member.updateMany({
        where: memberFilter,
        data: {
          outstandingDues: {
            decrement: cost.amount
          }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          actionType: "MAINTENANCE_COST_DELETED",
          performedBy: req.user.name,
          referenceId: cost.id,
          details: `Deleted annual maintenance cost configuration for FY ${cost.financialYear} (${cost.residenceType} - BHK ${cost.bhk}). Adjusted dues for corresponding members by -₹${cost.amount}`
        }
      });

      return cost;
    });

    res.json({ message: "Configuration deleted successfully", cost: result });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting maintenance cost configuration", error: error.message });
  }
});

export default router;
