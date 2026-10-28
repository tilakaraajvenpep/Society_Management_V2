import express from "express";
import prisma, { masterPrisma } from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

// Public status check (accessible without auth)
router.get("/public-status", async (req, res) => {
  try {
    const slug = req.query.slug ? String(req.query.slug).toLowerCase().trim() : null;
    
    // 1. Global maintenance
    let globalSetting = await masterPrisma.systemSetting.findUnique({
      where: { key: "global_maintenance" }
    });
    let globalMaintenance: any = { isMaintenance: false, targets: [], message: "", whitelistedEmails: [] };
    if (globalSetting && globalSetting.value) {
      try {
        globalMaintenance = JSON.parse(globalSetting.value);
      } catch (e) {}
    }

    // 2. Tenant maintenance
    let tenantMaintenance: any = null;
    let tenantDetails: any = null;
    if (slug) {
      const tenant = await masterPrisma.tenant.findFirst({
        where: {
          OR: [
            { slug },
            { name: { equals: slug, mode: "insensitive" } }
          ]
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          maintenanceConfig: true,
          brandingConfig: true,
          appVersionConfig: true
        }
      });
      if (tenant) {
        tenantDetails = tenant;
        if (tenant.maintenanceConfig) {
          try {
            tenantMaintenance = JSON.parse(tenant.maintenanceConfig);
          } catch (e) {}
        }
      }
    }

    res.json({
      globalMaintenance,
      tenantMaintenance,
      tenant: tenantDetails
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error checking status", error: error.message });
  }
});

// Authenticated routes
router.use(authenticate);

router.get("/platform-stats", authorize(["SUPER_ADMIN"]), async (req: any, res) => {
  try {
    const activeSocieties = await prisma.tenant.count({ where: { status: 'ACTIVE' } });
    const inactiveSocieties = await prisma.tenant.count({ where: { status: 'INACTIVE' } });
    const userCount = await prisma.user.count({ where: { role: "TENANT_ADMIN" } });
    const memberCount = await prisma.member.count();
    
    // Revenue from tenant subscriptions to the platform
    const platformRevenue = await prisma.tenant.aggregate({
      _sum: { subscriptionAmount: true }
    });

    // Total Maintenance Processed across platform
    const totalMaintenanceProcessed = await prisma.payment.aggregate({
      _sum: { amount: true }
    });

    res.json({
      activeSocieties,
      inactiveSocieties,
      totalAdmins: userCount,
      platformRevenue: platformRevenue._sum.subscriptionAmount || 0,
      totalProcessed: totalMaintenanceProcessed._sum.amount || 0,
      totalResidents: memberCount,
      systemStatus: "Online"
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching platform stats", error });
  }
});

// Superadmin: Get Maintenance Settings (Global & Tenant-wise)
router.get("/maintenance", authorize(["SUPER_ADMIN"]), async (req: any, res) => {
  try {
    let globalSetting = await masterPrisma.systemSetting.findUnique({
      where: { key: "global_maintenance" }
    });

    let globalConfig = {
      isMaintenance: false,
      targets: ["ADMIN_WEB", "MEMBER_WEB", "MOBILE_APP"],
      message: "Platform is under scheduled maintenance. Please check back shortly.",
      whitelistedEmails: []
    };

    if (globalSetting && globalSetting.value) {
      try {
        globalConfig = { ...globalConfig, ...JSON.parse(globalSetting.value) };
      } catch (e) {}
    }

    const tenants = await masterPrisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        maintenanceConfig: true,
        appVersionConfig: true
      },
      orderBy: { name: 'asc' }
    });

    const parsedTenants = tenants.map(t => {
      let mConf = {
        isMaintenance: false,
        targets: ["ADMIN_WEB", "MEMBER_WEB", "MOBILE_APP"],
        message: `${t.name} portal is currently under maintenance.`,
        whitelistedEmails: []
      };
      if (t.maintenanceConfig) {
        try {
          mConf = { ...mConf, ...JSON.parse(t.maintenanceConfig) };
        } catch (e) {}
      }

      let appVer = null;
      if (t.appVersionConfig) {
        try {
          appVer = JSON.parse(t.appVersionConfig);
        } catch (e) {}
      }

      return {
        ...t,
        maintenanceConfig: mConf,
        appVersionConfig: appVer
      };
    });

    res.json({
      globalMaintenance: globalConfig,
      tenants: parsedTenants
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching maintenance settings", error: error.message });
  }
});

// Superadmin: Update Global Maintenance
router.patch("/maintenance/global", authorize(["SUPER_ADMIN"]), async (req: any, res) => {
  try {
    const { isMaintenance, targets, message, whitelistedEmails } = req.body;
    const targetArr = Array.isArray(targets) ? targets : ["ADMIN_WEB", "MEMBER_WEB", "MOBILE_APP"];
    const cleanEmails = Array.isArray(whitelistedEmails) 
      ? whitelistedEmails.map((e: string) => e.toLowerCase().trim()).filter(Boolean)
      : [];
    const maintMsg = message || "System maintenance in progress. Only authorized testers can log in.";

    const configValue = JSON.stringify({
      isMaintenance: !!isMaintenance,
      targets: targetArr,
      message: maintMsg,
      whitelistedEmails: cleanEmails
    });

    const setting = await masterPrisma.systemSetting.upsert({
      where: { key: "global_maintenance" },
      update: { value: configValue },
      create: { key: "global_maintenance", value: configValue }
    });

    // Cascade to all tenants so tenant-level portals and mobile apps immediately reflect the entire platform maintenance
    try {
      const allTenants = await masterPrisma.tenant.findMany({
        select: { id: true, name: true, maintenanceConfig: true, appVersionConfig: true }
      });
      for (const t of allTenants) {
        let tMaint: any = {};
        if (t.maintenanceConfig) {
          try { tMaint = JSON.parse(t.maintenanceConfig); } catch (e) {}
        }
        tMaint.isMaintenance = !!isMaintenance;
        tMaint.targets = targetArr;
        if (maintMsg) tMaint.message = maintMsg;
        tMaint.whitelistedEmails = Array.from(new Set([...(tMaint.whitelistedEmails || []), ...cleanEmails]));

        const updateData: any = { maintenanceConfig: JSON.stringify(tMaint) };

        if (targetArr.includes("MOBILE_APP")) {
          let appVerObj: any = {};
          if (t.appVersionConfig) {
            try { appVerObj = JSON.parse(t.appVersionConfig); } catch (e) {}
          }
          appVerObj.maintenanceEnabled = !!isMaintenance;
          if (maintMsg) appVerObj.maintenanceMessage = maintMsg;
          updateData.appVersionConfig = JSON.stringify(appVerObj);
        }

        await masterPrisma.tenant.update({
          where: { id: t.id },
          data: updateData
        });
      }
    } catch (cascadeErr) {
      console.error("Error cascading global maintenance to tenants:", cascadeErr);
    }

    res.json({ message: "Global maintenance settings saved successfully", setting: JSON.parse(setting.value) });
  } catch (error: any) {
    res.status(500).json({ message: "Error saving global maintenance settings", error: error.message });
  }
});

// Superadmin: Update Tenant-specific Maintenance
router.patch("/maintenance/tenant/:id", authorize(["SUPER_ADMIN"]), async (req: any, res) => {
  try {
    const { id } = req.params;
    const { isMaintenance, targets, message, whitelistedEmails, syncMobileApp } = req.body;

    const tenant = await masterPrisma.tenant.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    const cleanEmails = Array.isArray(whitelistedEmails)
      ? whitelistedEmails.map((e: string) => e.toLowerCase().trim()).filter(Boolean)
      : [];

    const maintenanceObj = {
      isMaintenance: !!isMaintenance,
      targets: Array.isArray(targets) ? targets : ["ADMIN_WEB", "MEMBER_WEB", "MOBILE_APP"],
      message: message || `${tenant.name} portal is under maintenance.`,
      whitelistedEmails: cleanEmails
    };

    const updateData: any = {
      maintenanceConfig: JSON.stringify(maintenanceObj)
    };

    // Integrate with appVersionConfig mobile maintenance if targets include MOBILE_APP or sync requested
    if (syncMobileApp || maintenanceObj.targets.includes("MOBILE_APP")) {
      let appVerObj: any = {};
      if (tenant.appVersionConfig) {
        try { appVerObj = JSON.parse(tenant.appVersionConfig); } catch (e) {}
      }
      appVerObj.maintenanceEnabled = !!isMaintenance && maintenanceObj.targets.includes("MOBILE_APP");
      if (message) appVerObj.maintenanceMessage = message;
      updateData.appVersionConfig = JSON.stringify(appVerObj);
    }

    await masterPrisma.tenant.update({
      where: { id },
      data: updateData
    });

    // Also update tenant isolated schema if possible
    try {
      const { getTenantPrisma } = require("../utils/prisma");
      const tPrisma = getTenantPrisma(tenant.slug);
      await tPrisma.tenant.update({
        where: { id },
        data: updateData
      });
    } catch (e) {}

    res.json({ message: `Maintenance settings saved for ${tenant.name}`, maintenanceConfig: maintenanceObj });
  } catch (error: any) {
    res.status(500).json({ message: "Error updating tenant maintenance", error: error.message });
  }
});

export default router;
