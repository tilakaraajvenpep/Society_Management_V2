import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

router.use(authenticate);

// Generate dues for all members in the tenant for the current period
router.post("/generate-dues", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { tenantId } = req.user;

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { members: true },
    });

    if (!tenant) return res.status(404).json({ message: "Tenant not found" });

    const createdSubscriptions = await Promise.all(
      tenant.members.map(async (member) => {
        // Simple logic: create a pending subscription for the next month
        const now = new Date();
        const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        const dueDate = new Date(now.getFullYear(), now.getMonth(), 10); // Due on 10th

        return prisma.subscription.create({
          data: {
            tenantId,
            memberId: member.id,
            maintenanceAmount: tenant.maintenanceAmount,
            billingCycle: tenant.billingCycle,
            startDate,
            dueDate,
            status: "PENDING",
          },
        });
      })
    );

    res.json({ message: `Dues generated for ${createdSubscriptions.length} members`, data: createdSubscriptions });
  } catch (error) {
    res.status(500).json({ message: "Error generating dues", error });
  }
});

router.get("/outstanding", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const outstanding = await prisma.subscription.findMany({
    where: { tenantId: req.user.tenantId, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
    include: { member: true },
  });
  res.json(outstanding);
});

export default router;
