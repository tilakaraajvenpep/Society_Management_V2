import express from "express";
import bcrypt from "bcryptjs";
import prisma, { masterPrisma, getTenantPrisma, getTenantDbUrl } from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { Client } from "pg";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);
const router = express.Router();

// Public endpoint for tenant detection and config loading
router.get("/public/:slug", async (req, res) => {
  try {
    const cleanSlug = req.params.slug.toLowerCase().trim();
    const tenant = await masterPrisma.tenant.findFirst({
      where: {
        OR: [
          { slug: cleanSlug },
          { name: { equals: cleanSlug, mode: "insensitive" } }
        ]
      },
      select: { 
        id: true, 
        name: true, 
        slug: true, 
        status: true, 
        address: true,
        bankQrCodeUrl: true,
        bankUpiId: true,
        bankAccountName: true,
        bankName: true,
        bankAccountNumber: true,
        bankIfsc: true,
        brandingConfig: true,
        appVersionConfig: true,
        maintenanceConfig: true,
        superadminMenuConfig: true,
        tenantMenuConfig: true
      }
    });
    
    if (!tenant || tenant.status !== "ACTIVE") {
      return res.status(404).json({ message: "Tenant not found or inactive" });
    }

    let branding = { adminThemeColor: "#2563eb", memberThemeColor: "#2563eb", mobileThemeColor: "#2563eb" };
    if (tenant.brandingConfig) {
      try { branding = { ...branding, ...JSON.parse(tenant.brandingConfig) }; } catch (e) {}
    }

    let appVersion = {
      android: { currentVersion: "1.0.0", supportedVersion: "1.0.0", forceUpdate: false, storeUrl: "" },
      ios: { currentVersion: "1.0.0", supportedVersion: "1.0.0", forceUpdate: false, storeUrl: "" },
      maintenanceEnabled: false,
      maintenanceMessage: "Mobile app is currently under maintenance. Please check back later."
    };
    if (tenant.appVersionConfig) {
      try { appVersion = { ...appVersion, ...JSON.parse(tenant.appVersionConfig) }; } catch (e) {}
    }

    let maintenance = { isMaintenance: false, targets: ["ADMIN_WEB", "MEMBER_WEB", "MOBILE_APP"], message: "", whitelistedEmails: [] };
    if (tenant.maintenanceConfig) {
      try { maintenance = { ...maintenance, ...JSON.parse(tenant.maintenanceConfig) }; } catch (e) {}
    }

    let globalSetting = await masterPrisma.systemSetting.findUnique({ where: { key: "global_maintenance" } });
    let globalMaintenance = { isMaintenance: false, targets: [], message: "", whitelistedEmails: [] };
    if (globalSetting?.value) {
      try { globalMaintenance = JSON.parse(globalSetting.value); } catch (e) {}
    }

    let superadminMenus: any = null;
    if (tenant.superadminMenuConfig) {
      try { superadminMenus = JSON.parse(tenant.superadminMenuConfig); } catch (e) {}
    }
    let tenantMenus: any = null;
    if (tenant.tenantMenuConfig) {
      try { tenantMenus = JSON.parse(tenant.tenantMenuConfig); } catch (e) {}
    }

    res.json({
      ...tenant,
      branding,
      appVersion,
      maintenance,
      globalMaintenance,
      menus: {
        superadmin: superadminMenus,
        tenant: tenantMenus
      }
    });
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
  
  if (!name || !address || !adminEmail || !adminName) {
    return res.status(400).json({ message: "Society Name, Address, Admin Name, and Admin Email are required." });
  }

  const tenantSlug = slug || name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const schemaName = `society_${tenantSlug}`;

  // Check if tenant already exists in registry
  const existingTenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { slug: tenantSlug },
        { name: { equals: name, mode: "insensitive" } }
      ]
    }
  });

  if (existingTenant) {
    return res.status(400).json({ message: `A society with name "${name}" or slug "${tenantSlug}" already exists.` });
  }

  const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  const isClientLocalhost = masterConnectionString.includes("localhost") || masterConnectionString.includes("127.0.0.1");
  const pgClient = new Client({
    connectionString: masterConnectionString,
    ssl: isClientLocalhost ? false : { rejectUnauthorized: false }
  });

  try {
    await pgClient.connect();

    console.log(`Creating schema: ${schemaName}`);
    await pgClient.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // 2. Clone Enum Types from public to tenant schema
    console.log(`Cloning enum types from public to ${schemaName}...`);
    const enumQuery = `
      SELECT 
          t.typname AS enum_name,  
          e.enumlabel AS enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace  
      WHERE n.nspname = 'public'
      ORDER BY enum_name, e.enumsortorder;
    `;
    const enumRes = await pgClient.query(enumQuery);
    
    const enums: { [name: string]: string[] } = {};
    for (const row of enumRes.rows) {
      if (!enums[row.enum_name]) {
        enums[row.enum_name] = [];
      }
      enums[row.enum_name].push(row.enum_value);
    }

    for (const [enumName, values] of Object.entries(enums)) {
      const valuesStr = values.map(v => `'${v}'`).join(', ');
      try {
        await pgClient.query(`CREATE TYPE "${schemaName}"."${enumName}" AS ENUM (${valuesStr})`);
      } catch (enumErr: any) {
        if (!enumErr.message.includes("already exists")) {
          throw enumErr;
        }
      }
    }

    // 3. Clone tables from public schema to tenant schema
    console.log(`Cloning tables from public to ${schemaName}...`);
    const tablesRes = await pgClient.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations'`
    );
    
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      await pgClient.query(`CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (LIKE "public"."${tableName}" INCLUDING ALL)`);
    }

    // 4. Remap column enum types to target schema's enum types
    console.log(`Remapping column enum types to target schema: ${schemaName}...`);
    const colsRes = await pgClient.query(`
      SELECT 
          table_name, 
          column_name, 
          udt_name,
          column_default
      FROM 
          information_schema.columns 
      WHERE 
          table_schema = '${schemaName}' 
          AND udt_schema = 'public'
    `);
    for (const col of colsRes.rows) {
      const hasDefault = col.column_default !== null;
      if (hasDefault) {
        await pgClient.query(`ALTER TABLE "${schemaName}"."${col.table_name}" ALTER COLUMN "${col.column_name}" DROP DEFAULT`);
      }
      
      const remapQuery = `
        ALTER TABLE "${schemaName}"."${col.table_name}" 
        ALTER COLUMN "${col.column_name}" 
        TYPE "${schemaName}"."${col.udt_name}" 
        USING "${col.column_name}"::text::"${schemaName}"."${col.udt_name}"
      `;
      await pgClient.query(remapQuery);
      
      if (hasDefault) {
        const rawDefault = col.column_default.split('::')[0];
        await pgClient.query(`ALTER TABLE "${schemaName}"."${col.table_name}" ALTER COLUMN "${col.column_name}" SET DEFAULT ${rawDefault}::"${schemaName}"."${col.udt_name}"`);
      }
    }

    // 5. Clone foreign key constraints from public schema to tenant schema
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
  } finally {
    await pgClient.end().catch(() => {});
  }

  try {
    const parseValidDate = (d: any) => {
      if (!d) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    // 6. Register the tenant in the master registry database
    const tenant = await prisma.tenant.create({
      data: { 
        name, 
        address, 
        slug: tenantSlug,
        billingCycle: billingCycle || "MONTHLY", 
        maintenanceAmount: maintenanceAmount ? parseFloat(maintenanceAmount.toString()) : 0,
        enableForums: !!enableForums,
        subscriptionAmount: subscriptionAmount ? parseFloat(subscriptionAmount.toString()) : 0,
        lastRenewalDate: parseValidDate(lastRenewalDate),
        nextRenewalDate: parseValidDate(nextRenewalDate),
      },
    });

    // 7. Create the tenant record inside its own dynamic schema
    const tenantPrisma = getTenantPrisma(tenantSlug);
    await tenantPrisma.tenant.create({
      data: {
        id: tenant.id,
        name,
        address,
        slug: tenantSlug,
        billingCycle: billingCycle || "MONTHLY", 
        maintenanceAmount: maintenanceAmount ? parseFloat(maintenanceAmount.toString()) : 0,
        enableForums: !!enableForums,
        subscriptionAmount: subscriptionAmount ? parseFloat(subscriptionAmount.toString()) : 0,
        lastRenewalDate: parseValidDate(lastRenewalDate),
        nextRenewalDate: parseValidDate(nextRenewalDate),
      }
    });

    // 8. Create the tenant's admin user inside its own isolated database & public registry
    const hashedPassword = await bcrypt.hash(adminPassword || "admin123", 10);
    
    // In tenant schema
    await tenantPrisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        password: hashedPassword,
        role: "TENANT_ADMIN",
        tenantId: tenant.id,
      },
    });

    // In master public schema (so super admin list & relations work properly)
    try {
      await masterPrisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          role: "TENANT_ADMIN",
          tenantId: tenant.id,
        }
      });
    } catch (masterUserErr: any) {
      console.warn("Could not create tenant admin in master registry:", masterUserErr.message);
    }

    res.status(201).json(tenant);
  } catch (error: any) {
    console.error("Error creating tenant:", error);
    res.status(error?.status || 500).json({ message: error?.message || "Error creating tenant", error: error?.message || error });
  }
});

// Update tenant settings (used by Tenant Admin inside their session)
router.patch("/settings", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { 
    maintenanceAmount, billingCycle, quarterlyAmount, halfYearlyAmount, annualAmount, 
    enableForums, enableMonthlyReminder, monthlyReminderCount, monthlyReminderInterval, 
    enableOverdueReminder, overdueReminderInterval, discountDate, discountAmount, 
    lateFeeDate, lateFeeAmount,
    bankAccountName, bankName, bankAccountNumber, bankIfsc, bankUpiId, bankQrCodeUrl,
    bankReferenceRequired, bankProofRequired
  } = req.body;
  try {
    const updatePayload: any = { 
      maintenanceAmount: maintenanceAmount !== undefined ? parseFloat(maintenanceAmount.toString()) : undefined,
      billingCycle: billingCycle,
      quarterlyAmount: quarterlyAmount !== undefined ? (quarterlyAmount === null || quarterlyAmount === "" ? null : parseFloat(quarterlyAmount.toString())) : undefined,
      halfYearlyAmount: halfYearlyAmount !== undefined ? (halfYearlyAmount === null || halfYearlyAmount === "" ? null : parseFloat(halfYearlyAmount.toString())) : undefined,
      annualAmount: annualAmount !== undefined ? (annualAmount === null || annualAmount === "" ? null : parseFloat(annualAmount.toString())) : undefined,
      enableForums: enableForums !== undefined ? !!enableForums : undefined,
      enableMonthlyReminder: enableMonthlyReminder !== undefined ? !!enableMonthlyReminder : undefined,
      monthlyReminderCount: monthlyReminderCount !== undefined ? parseInt(monthlyReminderCount.toString(), 10) : undefined,
      monthlyReminderInterval: monthlyReminderInterval !== undefined ? parseInt(monthlyReminderInterval.toString(), 10) : undefined,
      enableOverdueReminder: enableOverdueReminder !== undefined ? !!enableOverdueReminder : undefined,
      overdueReminderInterval: overdueReminderInterval !== undefined ? parseInt(overdueReminderInterval.toString(), 10) : undefined,
      discountDate: discountDate !== undefined ? (discountDate === null || discountDate === "" ? null : new Date(discountDate)) : undefined,
      discountAmount: discountAmount !== undefined ? (discountAmount === null || discountAmount === "" ? 0 : parseFloat(discountAmount.toString())) : undefined,
      lateFeeDate: lateFeeDate !== undefined ? (lateFeeDate === null || lateFeeDate === "" ? null : new Date(lateFeeDate)) : undefined,
      lateFeeAmount: lateFeeAmount !== undefined ? (lateFeeAmount === null || lateFeeAmount === "" ? 0 : parseFloat(lateFeeAmount.toString())) : undefined,
      bankAccountName: bankAccountName !== undefined ? bankAccountName : undefined,
      bankName: bankName !== undefined ? bankName : undefined,
      bankAccountNumber: bankAccountNumber !== undefined ? bankAccountNumber : undefined,
      bankIfsc: bankIfsc !== undefined ? bankIfsc : undefined,
      bankUpiId: bankUpiId !== undefined ? bankUpiId : undefined,
      bankQrCodeUrl: bankQrCodeUrl !== undefined ? bankQrCodeUrl : undefined,
      bankReferenceRequired: bankReferenceRequired !== undefined ? !!bankReferenceRequired : undefined,
      bankProofRequired: bankProofRequired !== undefined ? !!bankProofRequired : undefined,
    };

    const tenant = await prisma.tenant.update({
      where: { id: req.user.tenantId as string },
      data: updatePayload,
    });

    try {
      await masterPrisma.tenant.update({
        where: { id: req.user.tenantId as string },
        data: updatePayload,
      });
    } catch (masterErr: any) {
      console.warn("Could not sync tenant settings to master database:", masterErr.message);
    }

    res.json(tenant);
  } catch (error) {
    res.status(500).json({ message: "Error updating settings", error });
  }
});

// ─── Tenant Admin: Branding Settings ─────────────────────────────────────────
router.get("/settings/branding", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const tenant = await masterPrisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { brandingConfig: true }
    });
    let branding = {
      adminThemeColor: "#2563eb",
      memberThemeColor: "#2563eb",
      mobileThemeColor: "#2563eb"
    };
    if (tenant?.brandingConfig) {
      try { branding = { ...branding, ...JSON.parse(tenant.brandingConfig) }; } catch (e) {}
    }
    res.json(branding);
  } catch (error: any) {
    res.status(500).json({ message: "Error loading branding settings", error: error.message });
  }
});

router.patch("/settings/branding", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const { adminThemeColor, memberThemeColor, mobileThemeColor } = req.body;
    const config = JSON.stringify({
      adminThemeColor: adminThemeColor || "#2563eb",
      memberThemeColor: memberThemeColor || "#2563eb",
      mobileThemeColor: mobileThemeColor || "#2563eb"
    });

    await masterPrisma.tenant.update({
      where: { id: req.user.tenantId },
      data: { brandingConfig: config }
    });

    try {
      await prisma.tenant.update({
        where: { id: req.user.tenantId },
        data: { brandingConfig: config }
      });
    } catch (e) {}

    res.json({ message: "Branding settings saved successfully", branding: JSON.parse(config) });
  } catch (error: any) {
    res.status(500).json({ message: "Error saving branding settings", error: error.message });
  }
});

// ─── Tenant Admin: Member Menu Toggles ───────────────────────────────────────
router.get("/settings/menu-config", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const tenant = await masterPrisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { superadminMenuConfig: true, tenantMenuConfig: true }
    });

    let saMenus = {
      admin: {
        dashboard: true,
        overview: true,
        members: true,
        payments: true,
        "ledger-reconciliation": true,
        upcoming: true,
        expenses: true,
        helpdesk: true,
        vendors: true,
        events: true,
        notifications: true,
        "member-menus": true,
        branding: true,
        "app-versions": true,
        settings: true,
        staff: true,
        logs: true,
        reports: true
      },
      memberWeb: { overview: true, "dues-history": true, payments: true, receipts: true, events: true, helpdesk: true, profile: true },
      memberMobile: { dashboard: true, payments: true, receipts: true, events: true, helpdesk: true, profile: true }
    };
    if (tenant?.superadminMenuConfig) {
      try {
        const parsed = JSON.parse(tenant.superadminMenuConfig);
        if (parsed.admin) saMenus.admin = { ...saMenus.admin, ...parsed.admin };
        if (parsed.memberWeb) saMenus.memberWeb = { ...saMenus.memberWeb, ...parsed.memberWeb };
        if (parsed.memberMobile) saMenus.memberMobile = { ...saMenus.memberMobile, ...parsed.memberMobile };
      } catch (e) {}
    }

    let tenantMenus = {
      memberWeb: { overview: true, "dues-history": true, payments: true, receipts: true, events: true, helpdesk: true, profile: true },
      memberMobile: { dashboard: true, payments: true, receipts: true, events: true, helpdesk: true, profile: true }
    };
    if (tenant?.tenantMenuConfig) {
      try {
        const parsed = JSON.parse(tenant.tenantMenuConfig);
        if (parsed.memberWeb) tenantMenus.memberWeb = { ...tenantMenus.memberWeb, ...parsed.memberWeb };
        if (parsed.memberMobile) tenantMenus.memberMobile = { ...tenantMenus.memberMobile, ...parsed.memberMobile };
      } catch (e) {}
    }

    res.json({
      superadminAllowed: saMenus,
      tenantToggles: tenantMenus
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching menu config", error: error.message });
  }
});

router.patch("/settings/menu-config", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const { memberWeb, memberMobile } = req.body;
    const config = JSON.stringify({
      memberWeb: memberWeb || {},
      memberMobile: memberMobile || {}
    });

    await masterPrisma.tenant.update({
      where: { id: req.user.tenantId },
      data: { tenantMenuConfig: config }
    });

    try {
      await prisma.tenant.update({
        where: { id: req.user.tenantId },
        data: { tenantMenuConfig: config }
      });
    } catch (e) {}

    res.json({ message: "Member menu settings saved successfully", config: JSON.parse(config) });
  } catch (error: any) {
    res.status(500).json({ message: "Error saving menu config", error: error.message });
  }
});

// ─── Tenant Admin: App Version Settings & Mobile Maintenance ─────────────────
router.get("/settings/app-version", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const tenant = await masterPrisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { appVersionConfig: true }
    });

    let appVersion = {
      android: { currentVersion: "1.0.0", supportedVersion: "1.0.0", forceUpdate: false, storeUrl: "" },
      ios: { currentVersion: "1.0.0", supportedVersion: "1.0.0", forceUpdate: false, storeUrl: "" },
      maintenanceEnabled: false,
      maintenanceMessage: "Mobile app is currently under maintenance. Please check back later."
    };

    if (tenant?.appVersionConfig) {
      try { appVersion = { ...appVersion, ...JSON.parse(tenant.appVersionConfig) }; } catch (e) {}
    }

    res.json(appVersion);
  } catch (error: any) {
    res.status(500).json({ message: "Error loading app version settings", error: error.message });
  }
});

router.patch("/settings/app-version", authenticate, authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const { android, ios, maintenanceEnabled, maintenanceMessage } = req.body;
    const config = JSON.stringify({
      android: android || { currentVersion: "1.0.0", supportedVersion: "1.0.0", forceUpdate: false, storeUrl: "" },
      ios: ios || { currentVersion: "1.0.0", supportedVersion: "1.0.0", forceUpdate: false, storeUrl: "" },
      maintenanceEnabled: !!maintenanceEnabled,
      maintenanceMessage: maintenanceMessage || "Mobile app is currently under maintenance. Please check back later."
    });

    await masterPrisma.tenant.update({
      where: { id: req.user.tenantId },
      data: { appVersionConfig: config }
    });

    try {
      await prisma.tenant.update({
        where: { id: req.user.tenantId },
        data: { appVersionConfig: config }
      });
    } catch (e) {}

    res.json({ message: "App version settings saved successfully", appVersion: JSON.parse(config) });
  } catch (error: any) {
    res.status(500).json({ message: "Error saving app version settings", error: error.message });
  }
});

// ─── Super Admin: Menu Settings by Tenant ────────────────────────────────────
router.get("/:id/menu-config", authenticate, authorize(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const tenant = await masterPrisma.tenant.findUnique({
      where: { id: String(req.params.id) },
      select: { id: true, name: true, slug: true, superadminMenuConfig: true, tenantMenuConfig: true }
    });

    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    let saMenus = {
      admin: {
        overview: true,
        members: true,
        payments: true,
        "ledger-reconciliation": true,
        upcoming: true,
        expenses: true,
        helpdesk: true,
        vendors: true,
        events: true,
        notifications: true,
        settings: true,
        staff: true,
        logs: true,
        reports: true
      },
      memberWeb: {
        overview: true,
        "dues-history": true,
        payments: true,
        receipts: true,
        events: true,
        helpdesk: true,
        profile: true
      },
      memberMobile: {
        dashboard: true,
        payments: true,
        receipts: true,
        events: true,
        helpdesk: true,
        profile: true
      }
    };

    if (tenant.superadminMenuConfig) {
      try {
        const parsed = JSON.parse(tenant.superadminMenuConfig);
        if (parsed.admin) saMenus.admin = { ...saMenus.admin, ...parsed.admin };
        if (parsed.memberWeb) saMenus.memberWeb = { ...saMenus.memberWeb, ...parsed.memberWeb };
        if (parsed.memberMobile) saMenus.memberMobile = { ...saMenus.memberMobile, ...parsed.memberMobile };
      } catch (e) {}
    }

    let tenantMenus: any = null;
    if (tenant.tenantMenuConfig) {
      try { tenantMenus = JSON.parse(tenant.tenantMenuConfig); } catch (e) {}
    }

    res.json({
      tenantId: tenant.id,
      tenantName: tenant.name,
      superadminMenuConfig: saMenus,
      tenantMenuConfig: tenantMenus
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching tenant menu config", error: error.message });
  }
});

router.patch("/:id/superadmin-menu-config", authenticate, authorize(["SUPER_ADMIN"]), async (req, res) => {
  try {
    const { admin, memberWeb, memberMobile } = req.body;
    const config = JSON.stringify({
      admin: admin || {},
      memberWeb: memberWeb || {},
      memberMobile: memberMobile || {}
    });

    const tenant = await masterPrisma.tenant.update({
      where: { id: String(req.params.id) },
      data: { superadminMenuConfig: config }
    });

    try {
      const { getTenantPrisma } = require("../utils/prisma");
      const tPrisma = getTenantPrisma(tenant.slug);
      await tPrisma.tenant.update({
        where: { id: tenant.id },
        data: { superadminMenuConfig: config }
      });
    } catch (e) {}

    res.json({ message: `Menu configuration updated for ${tenant.name}`, superadminMenuConfig: JSON.parse(config) });
  } catch (error: any) {
    res.status(500).json({ message: "Error updating menu config", error: error.message });
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
