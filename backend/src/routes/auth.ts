import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma, { masterPrisma, tenantStorage } from "../utils/prisma";

const router = express.Router();

import { authenticate } from "../middleware/auth";

router.get("/init-db", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    // Check if Super Admin exists
    let superAdmin = await masterPrisma.user.findFirst({
      where: { email: "superadmin@example.com", role: "SUPER_ADMIN" }
    });

    if (!superAdmin) {
      superAdmin = await masterPrisma.user.create({
        data: {
          email: "superadmin@example.com",
          password: hashedPassword,
          name: "Platform Admin",
          role: "SUPER_ADMIN",
          tenantId: null
        }
      });
      console.log("Super Admin seeded via endpoint:", superAdmin.email);
    } else {
      // Reset password just in case
      await masterPrisma.user.update({
        where: { id: superAdmin.id },
        data: { password: hashedPassword }
      });
      console.log("Super Admin password reset via endpoint");
    }

    res.json({ message: "Database initialized successfully", superAdmin: superAdmin.email });
  } catch (error: any) {
    console.error("Init DB Error:", error);
    res.status(500).json({ message: "Init DB Error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const rawIdentifier = req.body.identifier || req.body.email || req.body.mobile || req.body.username;
  const identifier = rawIdentifier ? String(rawIdentifier).trim() : "";
  const password = req.body.password ? String(req.body.password) : "";
  console.log("Login attempt for:", identifier);

  if (!identifier || !password) {
    return res.status(400).json({ message: "Identifier (email or mobile) and password are required" });
  }

  try {
    let { tenantId, tenantSlug } = req.body;

    if (tenantSlug && !tenantId) {
      const cleanSlug = String(tenantSlug).toLowerCase().trim();
      const tenant = await masterPrisma.tenant.findFirst({
        where: {
          OR: [
            { slug: cleanSlug },
            { name: { equals: cleanSlug, mode: "insensitive" } }
          ]
        }
      });
      if (tenant) {
        tenantId = tenant.id;
        tenantSlug = tenant.slug;
      } else {
        return res.status(404).json({ message: `Society "${tenantSlug}" not found` });
      }
    } else if (tenantId && !tenantSlug) {
      const tenant = await masterPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) {
        tenantSlug = tenant.slug;
      }
    }

    const runLogin = async () => {
      let user: any = null;
      const isEmail = identifier.includes('@');
      const cleanEmail = isEmail ? identifier.toLowerCase().trim() : "";
      const cleanMobile = !isEmail ? identifier.trim() : "";

      if (tenantId) {
        // Query tenant schema first
        if (isEmail) {
          user = await prisma.user.findFirst({
            where: { email: { equals: cleanEmail, mode: "insensitive" }, tenantId },
            include: { tenant: true }
          });
        } else {
          user = await prisma.user.findFirst({
            where: { mobile: cleanMobile, tenantId },
            include: { tenant: true }
          });
        }

        // Fallback to master registry if not in tenant schema
        if (!user) {
          if (isEmail) {
            user = await masterPrisma.user.findFirst({
              where: { email: { equals: cleanEmail, mode: "insensitive" }, tenantId },
              include: { tenant: true }
            });
          } else {
            user = await masterPrisma.user.findFirst({
              where: { mobile: cleanMobile, tenantId },
              include: { tenant: true }
            });
          }
        }
      } else {
        // If no tenantId is provided, they can ONLY log in as SUPER_ADMIN
        if (isEmail) {
          user = await masterPrisma.user.findFirst({
            where: { email: { equals: cleanEmail, mode: "insensitive" }, role: 'SUPER_ADMIN' },
            include: { tenant: true }
          });
        } else {
          user = await masterPrisma.user.findFirst({
            where: { mobile: cleanMobile, role: 'SUPER_ADMIN' },
            include: { tenant: true }
          });
        }
      }

      if (!user) {
        console.warn("User not found for identifier:", identifier);
        return res.status(401).json({ message: "User not found" });
      }

      const isMatch = await bcrypt.compare(password, user.password).catch(err => {
        console.error("Bcrypt error:", err);
        return false;
      });

      if (!isMatch) {
        console.warn("Password mismatch for:", identifier);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      let tenantDetails = user.tenant;
      const resolvedTenantId = user.tenantId || tenantId;
      if (!tenantDetails && resolvedTenantId) {
        tenantDetails = await masterPrisma.tenant.findUnique({
          where: { id: resolvedTenantId }
        });
      }

      // Maintenance enforcement (Super Admin is always exempt)
      if (user.role !== 'SUPER_ADMIN') {
        const clientType = req.body.clientType || (user.role === 'MEMBER' ? 'MEMBER_WEB' : 'ADMIN_WEB');
        const userEmail = (user.email || '').toLowerCase().trim();

        // 1. Global Maintenance check
        try {
          const globalSetting = await masterPrisma.systemSetting.findUnique({ where: { key: "global_maintenance" } });
          if (globalSetting?.value) {
            const gm = JSON.parse(globalSetting.value);
            if (gm.isMaintenance) {
              const targets = Array.isArray(gm.targets) ? gm.targets : [];
              if (targets.includes(clientType) || targets.includes("ALL")) {
                const whitelisted = (gm.whitelistedEmails || []).some((e: string) => e.toLowerCase().trim() === userEmail);
                if (!whitelisted) {
                  return res.status(503).json({
                    maintenance: true,
                    message: gm.message || "Platform-wide maintenance in progress. Only authorized testers can log in."
                  });
                }
              }
            }
          }
        } catch (e) {}

        // 2. Tenant Maintenance check
        if (tenantDetails?.maintenanceConfig) {
          try {
            const tm = JSON.parse(tenantDetails.maintenanceConfig);
            if (tm.isMaintenance) {
              const targets = Array.isArray(tm.targets) ? tm.targets : [];
              if (targets.includes(clientType) || targets.includes("ALL")) {
                const whitelisted = (tm.whitelistedEmails || []).some((e: string) => e.toLowerCase().trim() === userEmail);
                if (!whitelisted) {
                  return res.status(503).json({
                    maintenance: true,
                    message: tm.message || `${tenantDetails.name || 'Society'} portal is under maintenance. Only authorized testers can log in.`
                  });
                }
              }
            }
          } catch (e) {}
        }

        // 3. Mobile App Maintenance check from App Version config
        if (clientType === 'MOBILE_APP' && tenantDetails?.appVersionConfig) {
          try {
            const av = JSON.parse(tenantDetails.appVersionConfig);
            if (av.maintenanceEnabled) {
              let tmWhitelisted: string[] = [];
              if (tenantDetails.maintenanceConfig) {
                try { tmWhitelisted = JSON.parse(tenantDetails.maintenanceConfig).whitelistedEmails || []; } catch (e) {}
              }
              const whitelisted = tmWhitelisted.some((e: string) => e.toLowerCase().trim() === userEmail);
              if (!whitelisted) {
                return res.status(503).json({
                  maintenance: true,
                  message: av.maintenanceMessage || "Mobile app is currently under maintenance. Please check back later."
                });
              }
            }
          } catch (e) {}
        }
      }

      let branding = { adminThemeColor: "#2563eb", memberThemeColor: "#2563eb", mobileThemeColor: "#2563eb" };
      if (tenantDetails?.brandingConfig) {
        try { branding = { ...branding, ...JSON.parse(tenantDetails.brandingConfig) }; } catch (e) {}
      }

      let appVersion = null;
      if (tenantDetails?.appVersionConfig) {
        try { appVersion = JSON.parse(tenantDetails.appVersionConfig); } catch (e) {}
      }

      let superadminMenus = null;
      if (tenantDetails?.superadminMenuConfig) {
        try { superadminMenus = JSON.parse(tenantDetails.superadminMenuConfig); } catch (e) {}
      }
      let tenantMenus = null;
      if (tenantDetails?.tenantMenuConfig) {
        try { tenantMenus = JSON.parse(tenantDetails.tenantMenuConfig); } catch (e) {}
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId || tenantId,
          designation: user.designation
        },
        process.env.JWT_SECRET || "secret",
        { expiresIn: "1d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          mobile: user.mobile,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId || tenantId,
          tenantName: tenantDetails?.name || user.tenant?.name,
          tenantAddress: tenantDetails?.address || user.tenant?.address,
          designation: user.designation || null,
        },
        branding,
        appVersion,
        menus: {
          superadmin: superadminMenus,
          tenant: tenantMenus
        }
      });
    };

    if (tenantSlug) {
      await tenantStorage.run({ tenantSlug }, runLogin);
    } else {
      await runLogin();
    }
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.patch("/profile", authenticate, async (req: any, res) => {
  const { name, email, mobile, password } = req.body;
  if (mobile) {
    const targetMobile = mobile.trim();
    if (targetMobile !== "" && !/^\d{10}$/.test(targetMobile)) {
      return res.status(400).json({ message: "Mobile number must be exactly 10 digits" });
    }
  }
  try {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (mobile !== undefined) updateData.mobile = mobile ? mobile.trim() : null;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      include: { tenant: true }
    });

    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, mobile: updatedUser.mobile, name: updatedUser.name, role: updatedUser.role, tenantId: updatedUser.tenantId, designation: updatedUser.designation },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        mobile: updatedUser.mobile,
        name: updatedUser.name,
        role: updatedUser.role,
        tenantId: updatedUser.tenantId,
        tenantName: updatedUser.tenant?.name,
        tenantAddress: updatedUser.tenant?.address,
        designation: updatedUser.designation || null,
      },
    });
  } catch (error: any) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ message: "Server error updating profile", error: error.message });
  }
});

export default router;
