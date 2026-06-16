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
    const dbName = `society_${tenantSlug}`;

    // 1. Create the database in PostgreSQL
    const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
    let pgConnectionString = masterConnectionString;
    try {
      const parsed = new URL(masterConnectionString);
      parsed.pathname = "/postgres";
      pgConnectionString = parsed.toString();
    } catch (e) {
      pgConnectionString = masterConnectionString.replace(/\/society_management$/, "/postgres");
    }
    const isClientLocalhost = pgConnectionString.includes("localhost") || pgConnectionString.includes("127.0.0.1");
    const pgClient = new Client({
      connectionString: pgConnectionString,
      ssl: isClientLocalhost ? false : { rejectUnauthorized: false }
    });
    await pgClient.connect();
    const checkDb = await pgClient.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (checkDb.rowCount === 0) {
      await pgClient.query(`CREATE DATABASE "${dbName}"`);
    }
    await pgClient.end();

    // 2. Initialize the schema using npx prisma db push on the new database
    const tenantDbUrl = getTenantDbUrl(tenantSlug);
    console.log(`Initializing schema for isolated database: ${dbName}`);
    await execPromise(`npx prisma db push --url ${tenantDbUrl}`, {
      env: {
        ...process.env
      }
    });

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

    // 2. Drop the isolated tenant database
    const dbName = `society_${tenant.slug}`;
    const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
    let pgConnectionString = masterConnectionString;
    try {
      const parsed = new URL(masterConnectionString);
      parsed.pathname = "/postgres";
      pgConnectionString = parsed.toString();
    } catch (e) {
      pgConnectionString = masterConnectionString.replace(/\/society_management$/, "/postgres");
    }
    const isClientLocalhost = pgConnectionString.includes("localhost") || pgConnectionString.includes("127.0.0.1");
    const pgClient = new Client({
      connectionString: pgConnectionString,
      ssl: isClientLocalhost ? false : { rejectUnauthorized: false }
    });
    await pgClient.connect();
    // Terminate any active connections to release locks
    await pgClient.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);
    await pgClient.query(`DROP DATABASE IF EXISTS "${dbName}"`);
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
