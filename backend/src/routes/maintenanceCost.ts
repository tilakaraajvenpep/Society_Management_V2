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
  const { financialYear, amount } = req.body;
  
  if (!financialYear || amount === undefined) {
    return res.status(400).json({ message: "Financial year and amount are required" });
  }

  const parsedAmount = parseFloat(amount.toString());
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ message: "Amount must be a positive number" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Find existing cost for difference calculation
      const existingCost = await tx.maintenanceCost.findUnique({
        where: {
          tenantId_financialYear: {
            tenantId: req.user.tenantId,
            financialYear: financialYear.trim()
          }
        }
      });

      const oldAmount = existingCost ? existingCost.amount : 0;
      const diff = parsedAmount - oldAmount;

      const cost = await tx.maintenanceCost.upsert({
        where: {
          tenantId_financialYear: {
            tenantId: req.user.tenantId,
            financialYear: financialYear.trim()
          }
        },
        update: {
          amount: parsedAmount
        },
        create: {
          tenantId: req.user.tenantId,
          financialYear: financialYear.trim(),
          amount: parsedAmount
        }
      });

      if (diff !== 0) {
        await tx.member.updateMany({
          where: {
            tenantId: req.user.tenantId,
            registrationYear: financialYear.trim()
          },
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
          details: `Configured annual maintenance cost for FY ${financialYear} as ₹${parsedAmount}. Adjusted dues for corresponding members by diff of ₹${diff}`
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

      // Decrease outstanding dues of all members registered in this financial year
      await tx.member.updateMany({
        where: {
          tenantId: req.user.tenantId,
          registrationYear: cost.financialYear
        },
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
          details: `Deleted annual maintenance cost configuration for FY ${cost.financialYear}. Adjusted dues for corresponding members by -₹${cost.amount}`
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
