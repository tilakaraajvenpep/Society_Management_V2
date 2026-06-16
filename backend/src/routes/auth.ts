import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma, { masterPrisma, tenantStorage } from "../utils/prisma";

const router = express.Router();

import { authenticate } from "../middleware/auth";

router.post("/login", async (req, res) => {
  const { identifier: rawIdentifier, password } = req.body;
  const identifier = rawIdentifier?.trim();
  console.log("Login attempt for:", identifier);

  try {
    const { tenantId } = req.body;
    let tenantSlug = "";
    if (tenantId) {
      const tenant = await masterPrisma.tenant.findUnique({ where: { id: tenantId } });
      if (tenant) {
        tenantSlug = tenant.slug;
      }
    }

    const runLogin = async () => {
      let user;
      
      if (identifier.includes('@')) {
        const email = identifier.toLowerCase();
        if (tenantId) {
          user = await prisma.user.findUnique({
            where: { email_tenantId: { email, tenantId } },
            include: { tenant: true }
          });
        } else {
          // If no tenantId is provided, they can ONLY log in as SUPER_ADMIN
          user = await masterPrisma.user.findFirst({
            where: { email, role: 'SUPER_ADMIN' },
            include: { tenant: true }
          });
        }
      } else {
        if (tenantId) {
          user = await prisma.user.findUnique({
            where: { mobile_tenantId: { mobile: identifier, tenantId } },
            include: { tenant: true }
          });
        } else {
          // If no tenantId is provided, they can ONLY log in as SUPER_ADMIN
          user = await masterPrisma.user.findFirst({
            where: { mobile: identifier, role: 'SUPER_ADMIN' },
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

      const token = jwt.sign(
        { id: user.id, email: user.email, mobile: user.mobile, name: user.name, role: user.role, tenantId: user.tenantId, designation: user.designation },
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
          tenantId: user.tenantId,
          tenantName: user.tenant?.name,
          tenantAddress: user.tenant?.address,
          designation: user.designation || null,
        },
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
  try {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email || null;
    if (mobile !== undefined) updateData.mobile = mobile || null;
    
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
