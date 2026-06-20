import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import pg from "pg";

const router = express.Router();

router.use(authenticate);

const getStartYear = (fy: string) => {
  const match = fy.trim().match(/^(\d{4})/);
  return match ? parseInt(match[1], 10) : 0;
};

const recalculateDuesForAllMembers = async (tx: any, tenantId: string) => {
  const members = await tx.member.findMany({
    where: { tenantId, status: "ACTIVE" }
  });

  const costs = await tx.maintenanceCost.findMany({
    where: { tenantId }
  });

  const payments = await tx.payment.findMany({
    where: { tenantId, status: { not: "CANCELLED" } }
  });

  for (const m of members) {
    const regYear = m.registrationYear || "";
    const regStartYear = getStartYear(regYear);
    if (!regStartYear) continue;

    // Calculate total applicable costs
    const uniqueYears = Array.from(new Set(costs.map((c: any) => c.financialYear)))
      .filter((fy: any) => getStartYear(fy) >= regStartYear);

    let totalApplicable = 0;
    for (const fy of uniqueYears) {
      let costResType = "COMMON";
      let costBhk = "COMMON";
      if (!m.useCommonMaintenance) {
        costResType = m.residenceType || "COMMON";
        costBhk = m.bhk || "COMMON";
      }

      let cost = costs.find((c: any) =>
        c.financialYear === fy &&
        c.residenceType === costResType &&
        c.bhk === costBhk
      );

      if (cost) {
        totalApplicable += cost.amount;
      }
    }

    const memberPayments = payments.filter((p: any) => p.memberId === m.id);
    const totalPaid = memberPayments.reduce((sum: number, p: any) => sum + (p.amount || 0) - (p.lateFee || 0) + (p.discount || 0), 0);

    const correctDues = totalApplicable - totalPaid;
    if (m.outstandingDues !== correctDues) {
      await tx.member.update({
        where: { id: m.id },
        data: { outstandingDues: correctDues }
      });
    }
  }
};


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
    console.error("Error fetching maintenance costs:", error);
    if ((global as any).lastErrors) {
      (global as any).lastErrors.push({
        timestamp: new Date().toISOString(),
        action: "GET /api/maintenance-costs",
        error: msg,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
        user: req.user
      });
      if ((global as any).lastErrors.length > 20) (global as any).lastErrors.shift();
    }
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
    res.status(500).json({ 
      message: "Error fetching maintenance costs", 
      error: msg,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
  }
});

// POST bulk setup or update annual maintenance costs (Upsert)
router.post("/bulk", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { financialYear, residenceType, configs } = req.body;

  if (!financialYear || !residenceType || !Array.isArray(configs)) {
    return res.status(400).json({ message: "Financial year, residence type, and configs array are required" });
  }

  try {
    const results = await prisma.$transaction(async (tx) => {
      const savedCosts = [];
      for (const item of configs) {
        const { amount, bhk } = item;
        if (amount === undefined || amount === null || !bhk) continue;

        const parsedAmount = parseFloat(amount.toString());
        if (isNaN(parsedAmount) || parsedAmount < 0) continue;

        const targetBhk = bhk.trim();

        const existingCost = await tx.maintenanceCost.findUnique({
          where: {
            tenantId_financialYear_residenceType_bhk: {
              tenantId: req.user.tenantId,
              financialYear: financialYear.trim(),
              residenceType,
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
              residenceType,
              bhk: targetBhk
            }
          },
          update: { amount: parsedAmount },
          create: {
            tenantId: req.user.tenantId,
            financialYear: financialYear.trim(),
            amount: parsedAmount,
            residenceType,
            bhk: targetBhk
          }
        });

        await tx.auditLog.create({
          data: {
            tenantId: req.user.tenantId,
            actionType: "MAINTENANCE_COST_SETUP",
            performedBy: req.user.name,
            referenceId: cost.id,
            details: `Configured annual maintenance cost for FY ${financialYear} (${residenceType} - BHK ${targetBhk}) as Rs.${parsedAmount}.`
          }
        });

        savedCosts.push(cost);
      }

      // Recalculate dues for all active members to ensure accuracy
      await recalculateDuesForAllMembers(tx, req.user.tenantId);

      return savedCosts;
    });

    res.json(results);
  } catch (error: any) {
    const msg = error.message || "";
    console.error("Error setting up bulk maintenance costs:", error);
    if ((global as any).lastErrors) {
      (global as any).lastErrors.push({
        timestamp: new Date().toISOString(),
        action: "POST /api/maintenance-costs/bulk",
        error: msg,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
        body: req.body,
        user: req.user
      });
      if ((global as any).lastErrors.length > 20) (global as any).lastErrors.shift();
    }
    res.status(500).json({ message: "Error setting up bulk maintenance costs", error: msg });
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

      await tx.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          actionType: "MAINTENANCE_COST_SETUP",
          performedBy: req.user.name,
          referenceId: cost.id,
          details: `Configured annual maintenance cost for FY ${financialYear} (${targetResType} - BHK ${targetBhk}) as Rs.${parsedAmount}.`
        }
      });

      // Recalculate dues for all active members to ensure accuracy
      await recalculateDuesForAllMembers(tx, req.user.tenantId);

      return cost;
    });

    res.json(result);
  } catch (error: any) {
    const msg = error.message || "";
    console.error("Error setting up maintenance cost:", error);
    if ((global as any).lastErrors) {
      (global as any).lastErrors.push({
        timestamp: new Date().toISOString(),
        action: "POST /api/maintenance-costs",
        error: msg,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
        body: req.body,
        user: req.user
      });
      if ((global as any).lastErrors.length > 20) (global as any).lastErrors.shift();
    }
    if (msg.includes("does not exist") || msg.includes("relation") || error.code === "P2021") {
      await ensureMaintenanceCostTable().catch(() => {});
      return res.status(503).json({ 
        message: "Table was just created. Please try again in a moment.",
        error: msg,
        code: error.code
      });
    }
    res.status(500).json({ 
      message: "Error setting up maintenance cost", 
      error: msg,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
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

      await tx.auditLog.create({
        data: {
          tenantId: req.user.tenantId,
          actionType: "MAINTENANCE_COST_DELETED",
          performedBy: req.user.name,
          referenceId: cost.id,
          details: `Deleted annual maintenance cost configuration for FY ${cost.financialYear} (${cost.residenceType} - BHK ${cost.bhk}).`
        }
      });

      // Recalculate dues for all active members to ensure accuracy
      await recalculateDuesForAllMembers(tx, req.user.tenantId);

      return cost;
    });

    res.json({ message: "Configuration deleted successfully", cost: result });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting maintenance cost configuration", error: error.message });
  }
});

export default router;
