import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { identifier: rawIdentifier, password } = req.body;
  const identifier = rawIdentifier?.trim();
  console.log("Login attempt for:", identifier);

  try {
    const { tenantId } = req.body;
    let user;
    
    if (identifier.includes('@')) {
      const email = identifier.toLowerCase();
      if (tenantId) {
        user = await prisma.user.findUnique({
          where: { email_tenantId: { email, tenantId } },
          include: { tenant: true }
        });
      } else {
        user = await prisma.user.findFirst({
          where: { email },
          include: { tenant: true },
          orderBy: { createdAt: 'desc' }
        });
      }
    } else {
      if (tenantId) {
        user = await prisma.user.findUnique({
          where: { mobile_tenantId: { mobile: identifier, tenantId } },
          include: { tenant: true }
        });
      } else {
        user = await prisma.user.findFirst({
          where: { mobile: identifier },
          include: { tenant: true },
          orderBy: { createdAt: 'desc' }
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
      { id: user.id, email: user.email, mobile: user.mobile, name: user.name, role: user.role, tenantId: user.tenantId },
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
      },
    });
  } catch (error: any) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
