import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

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

export default router;
