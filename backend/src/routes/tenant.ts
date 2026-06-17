import express from "express";
import bcrypt from "bcryptjs";
import prisma, { getTenantPrisma, getTenantDbUrl } from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { Client } from "pg";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);
const router = express.Router();

// Public endpoint for tenant detection
router.get("/public/:slug", async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug },
      select: { id: true, name: true, slug: true, status: true }
    });
    
    if (!tenant || tenant.status !== "ACTIVE") {
      return res.status(404).json({ message: "Tenant not found or inactive" });
    }
    
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tenant info", error });
  }
});

// Super Admin only: Get all tenants
router.get("/", authenticate, authorize(["SUPER_ADMIN"]), async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: { users: { where: { role: "TENANT_ADMIN" } } },
  });
  res.json(tenants);
});

// Super Admin only: Create a new tenant with its own separate database
router.post("/", authenticate, authorize(["SUPER_ADMIN"]), async (req, res) => {
  const { name, address, billingCycle, maintenanceAmount, adminEmail, adminName, adminPassword, slug, subscriptionAmount, lastRenewalDate, nextRenewalDate, enableForums } = req.body;
  try {
    const tenantSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const schemaName = `society_${tenantSlug}`;

    // 1. Create the schema in PostgreSQL
    const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
    const isClientLocalhost = masterConnectionString.includes("localhost") || masterConnectionString.includes("127.0.0.1");
    const pgClient = new Client({
      connectionString: masterConnectionString,
      ssl: isClientLocalhost ? false : { rejectUnauthorized: false }
    });
    await pgClient.connect();

    console.log(`Creating schema: ${schemaName}`);
    await pgClient.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // 2. Clone tables from public schema to tenant schema
    console.log(`Cloning tables from public to ${schemaName}...`);
    const tablesRes = await pgClient.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations'`
    );
    
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      await pgClient.query(`CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (LIKE "public"."${tableName}" INCLUDING ALL)`);
    }

    // 3. Clone foreign key constraints from public schema to tenant schema
    console.log(`Cloning foreign key constraints from public to ${schemaName}...`);
    const fkQuery = `
      SELECT 
          tc.table_name, 
          tc.constraint_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name, 
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON rc.unique_constraint_name = ccu.constraint_name
            AND rc.unique_constraint_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `;
    const fkRes = await pgClient.query(fkQuery);
    for (const fk of fkRes.rows) {
      const alterQuery = `
        ALTER TABLE "${schemaName}"."${fk.table_name}"
        ADD CONSTRAINT "${fk.constraint_name}"
        FOREIGN KEY ("${fk.column_name}")
        REFERENCES "${schemaName}"."${fk.foreign_table_name}" ("${fk.foreign_column_name}")
        ON UPDATE ${fk.update_rule}
        ON DELETE ${fk.delete_rule}
      `;
      try {
        await pgClient.query(alterQuery);
      } catch (err: any) {
        if (!err.message.includes("already exists")) {
          throw err;
        }
      }
    }
    await pgClient.end();

    // 3. Register the tenant in the master registry database
    const tenant = await prisma.tenant.create({
      data: { 
        name, 
        address, 
        slug: tenantSlug,
        billingCycle, 
        maintenanceAmount: maintenanceAmount || 0,
        enableForums: !!enableForums,
        subscriptionAmount: subscriptionAmount || 0,
        lastRenewalDate: lastRenewalDate ? new Date(lastRenewalDate) : null,
        nextRenewalDate: nextRenewalDate ? new Date(nextRenewalDate) : null,
      },
    });

    // 4. Create the tenant record inside its own dynamic database to support local relations
    const tenantPrisma = getTenantPrisma(tenantSlug);
    await tenantPrisma.tenant.create({
      data: {
        id: tenant.id,
        name,
        address,
        slug: tenantSlug,
        billingCycle,
        maintenanceAmount: maintenanceAmount || 0,
        enableForums: !!enableForums,
        subscriptionAmount: subscriptionAmount || 0,
        lastRenewalDate: lastRenewalDate ? new Date(lastRenewalDate) : null,
        nextRenewalDate: nextRenewalDate ? new Date(nextRenewalDate) : null,
      }
    });

    // 5. Create the tenant's admin user inside its own isolated database
    const hashedPassword = await bcrypt.hash(adminPassword || "admin123", 10);
    await tenantPrisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: "TENANT_ADMIN",
        tenantId: tenant.id,
      },
    });

    res.status(201).json(tenant);
  } catch (error) {
    console.error("Error creating tenant:", error);
    res.status(500).json({ message: "Error creating tenant", error });
  }
});

// Update tenant settings (used by Tenant Admin inside their session)
router.patch("/settings", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { maintenanceAmount, billingCycle, quarterlyAmount, halfYearlyAmount, annualAmount, enableForums } = req.body;
  try {
    const tenant = await prisma.tenant.update({
      where: { id: req.user.tenantId as string },
      data: { 
        maintenanceAmount: maintenanceAmount !== undefined ? parseFloat(maintenanceAmount.toString()) : undefined,
        billingCycle: billingCycle,
        quarterlyAmount: quarterlyAmount !== undefined ? (quarterlyAmount === null || quarterlyAmount === "" ? null : parseFloat(quarterlyAmount.toString())) : undefined,
        halfYearlyAmount: halfYearlyAmount !== undefined ? (halfYearlyAmount === null || halfYearlyAmount === "" ? null : parseFloat(halfYearlyAmount.toString())) : undefined,
        annualAmount: annualAmount !== undefined ? (annualAmount === null || annualAmount === "" ? null : parseFloat(annualAmount.toString())) : undefined,
        enableForums: enableForums !== undefined ? !!enableForums : undefined,
      },
    });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: "Error updating settings", error });
  }
});

// Super Admin: Update a tenant
router.patch("/:id", authenticate, authorize(["SUPER_ADMIN"]), async (req, res) => {
  const { name, address, billingCycle, status, adminPassword, adminName, adminEmail, slug, subscriptionAmount, lastRenewalDate, nextRenewalDate, enableForums } = req.body;
  try {
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id as string },
      data: { 
        name, 
        address, 
        billingCycle, 
        status, 
        slug,
        enableForums: enableForums !== undefined ? !!enableForums : undefined,
        subscriptionAmount: subscriptionAmount ? parseFloat(subscriptionAmount.toString()) : undefined,
        lastRenewalDate: lastRenewalDate ? new Date(lastRenewalDate) : undefined,
        nextRenewalDate: nextRenewalDate ? new Date(nextRenewalDate) : undefined,
      },
    });

    // Mirror update inside the tenant's isolated database
    const tenantPrisma = getTenantPrisma(tenant.slug);
    await tenantPrisma.tenant.update({
      where: { id: tenant.id },
      data: {
        name,
        address,
        billingCycle,
        status,
        slug,
        enableForums: enableForums !== undefined ? !!enableForums : undefined,
        subscriptionAmount: subscriptionAmount ? parseFloat(subscriptionAmount.toString()) : undefined,
        lastRenewalDate: lastRenewalDate ? new Date(lastRenewalDate) : undefined,
        nextRenewalDate: nextRenewalDate ? new Date(nextRenewalDate) : undefined,
      }
    });

    // Update Admin User details in tenant database if provided
    if (adminName || adminEmail || adminPassword) {
      const updateData: any = {};
      if (adminName) updateData.name = adminName;
      if (adminEmail) updateData.email = adminEmail;
      
      if (adminPassword) {
        updateData.password = await bcrypt.hash(adminPassword, 10);
      }

      await tenantPrisma.user.updateMany({
        where: { tenantId: req.params.id as string, role: "TENANT_ADMIN" },
        data: updateData,
      });
    }

    res.json(tenant);
  } catch (error) {
    console.error("Error updating tenant:", error);
    res.status(500).json({ message: "Error updating tenant", error });
  }
});

// Super Admin: Toggle status of tenant
router.patch("/:id/toggle-status", authenticate, authorize(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const current = await prisma.tenant.findUnique({ where: { id: req.params.id as string } });
    const newStatus = current?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const tenant = await prisma.tenant.update({
      where: { id: req.params.id as string },
      data: { status: newStatus },
    });

    // Mirror update inside tenant database
    const tenantPrisma = getTenantPrisma(tenant.slug);
    await tenantPrisma.tenant.update({
      where: { id: tenant.id },
      data: { status: newStatus },
    });

    res.json(tenant);
  } catch (error) {
    console.error("Error toggling status:", error);
    res.status(500).json({ message: "Error toggling status", error });
  }
});

// Super Admin: Delete a tenant and its isolated database completely
router.delete("/:id", authenticate, authorize(["SUPER_ADMIN"]), async (req, res) => {
  const tenantId = req.params.id as string;
  try {
    // 1. Find the tenant first to retrieve its slug
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // 2. Drop the isolated tenant schema
    const schemaName = `society_${tenant.slug}`;
    const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
    const isClientLocalhost = masterConnectionString.includes("localhost") || masterConnectionString.includes("127.0.0.1");
    const pgClient = new Client({
      connectionString: masterConnectionString,
      ssl: isClientLocalhost ? false : { rejectUnauthorized: false }
    });
    await pgClient.connect();
    await pgClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
    await pgClient.end();

    // 3. Delete registry row in the master database
    await prisma.tenant.delete({ where: { id: tenantId } });

    res.json({ message: "Tenant database dropped and tenant deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting tenant:", error);
    res.status(500).json({ message: "Error deleting tenant", error: error.message });
  }
});

// Tenant admin only: Audit logs
router.get("/logs", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { timestamp: "desc" },
      take: 50
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching logs", error });
  }
});

export default router;
