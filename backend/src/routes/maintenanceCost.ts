import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import pg from "pg";

const router = express.Router();

router.use(authenticate);

// Helper: create MaintenanceCost table in public schema if it doesn't exist
async function ensureMaintenanceCostTable() {
  const connStr = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  const isLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1");
  const client = new pg.Client({
    connectionString: connStr,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MaintenanceCost" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "tenantId" TEXT NOT NULL,
        "financialYear" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "residenceType" TEXT NOT NULL DEFAULT 'COMMON',
        "bhk" TEXT NOT NULL DEFAULT 'COMMON',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MaintenanceCost_pkey" PRIMARY KEY ("id")
      )
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceCost_tenantId_financialYear_residenceType_bhk_key"
      ON "MaintenanceCost"("tenantId", "financialYear", "residenceType", "bhk")
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'MaintenanceCost_tenantId_fkey'
        ) THEN
          ALTER TABLE "MaintenanceCost"
          ADD CONSTRAINT "MaintenanceCost_tenantId_fkey"
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);
    console.log("[MaintenanceCost] Table ensured in public schema.");
  } catch (err: any) {
    console.error("[MaintenanceCost] Failed to ensure table:", err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

// GET all configured maintenance costs for the tenant
router.get("/", authorize(["TENANT_ADMIN", "MEMBER"]), async (req: any, res) => {
  try {
    const costs = await prisma.maintenanceCost.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { financialYear: "asc" }
    });
    res.json(costs);
  } catch (error: any) {
    const msg = error.message || "";
    // Table doesn't exist - auto-create it and return empty
    if (
      msg.includes("does not exist") ||
      msg.includes("relation") ||
      msg.includes("MaintenanceCost") ||
      error.code === "P2021" ||
      error.code === "P1001"
    ) {
      await ensureMaintenanceCostTable().catch(() => {});
      return res.json([]);
    }
    res.status(500).json({ message: "Error fetching maintenance costs", error: msg });
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
        update: { amount: parsedAmount },
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
            residenceType: targetResType,
            bhk: targetBhk
          };
        }

        await tx.member.updateMany({
          where: memberFilter,
          data: { outstandingDues: { increment: diff } }
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          actionType: "MAINTENANCE_COST_SETUP",
          performedBy: req.user.name,
          referenceId: cost.id,
          details: `Configured annual maintenance cost for FY ${financialYear} (${targetResType} - BHK ${targetBhk}) as Rs.${parsedAmount}. Adjusted dues for corresponding members by diff of Rs.${diff}`
        }
      });

      return cost;
    });

    res.json(result);
  } catch (error: any) {
    const msg = error.message || "";
    if (msg.includes("does not exist") || msg.includes("relation") || error.code === "P2021") {
      await ensureMaintenanceCostTable().catch(() => {});
      return res.status(503).json({ message: "Table was just created. Please try again in a moment." });
    }
    res.status(500).json({ message: "Error setting up maintenance cost", error: msg });
  }
});

// DELETE a configured maintenance cost
router.delete("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const cost = await tx.maintenanceCost.findUnique({
        where: { id: req.params.id, tenantId: req.user.tenantId }
      });

      if (!cost) throw new Error("Maintenance cost configuration not found");

      await tx.maintenanceCost.delete({ where: { id: req.params.id } });

      let memberFilter: any = {
        tenantId: req.user.tenantId,
        registrationYear: cost.financialYear
      };

      if (cost.residenceType === "COMMON" && cost.bhk === "COMMON") {
        memberFilter = {
          ...memberFilter,
          OR: [{ useCommonMaintenance: true }, { residenceType: "COMMON" }]
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
        data: { outstandingDues: { decrement: cost.amount } }
      });

      await tx.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          actionType: "MAINTENANCE_COST_DELETED",
          performedBy: req.user.name,
          referenceId: cost.id,
          details: `Deleted annual maintenance cost configuration for FY ${cost.financialYear} (${cost.residenceType} - BHK ${cost.bhk}). Adjusted dues for corresponding members by -Rs.${cost.amount}`
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
