import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

router.use(authenticate);

router.get("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const vendors = await prisma.vendor.findMany({
    where: { tenantId: req.user.tenantId },
    orderBy: { name: "asc" },
  });
  res.json(vendors);
});

router.post("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { name, serviceType, contact, email, address, notes } = req.body;
  try {
    const vendor = await prisma.vendor.create({
      data: { name, serviceType, contact, email, address, notes, tenantId: req.user.tenantId },
    });
    res.json(vendor);
  } catch (error: any) {
    res.status(500).json({ message: "Error creating vendor", error: error.message });
  }
});

router.patch("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { name, serviceType, contact, email, address, notes } = req.body;
  try {
    const vendor = await prisma.vendor.update({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: {
        ...(name !== undefined && { name }),
        ...(serviceType !== undefined && { serviceType }),
        ...(contact !== undefined && { contact }),
        ...(email !== undefined && { email }),
        ...(address !== undefined && { address }),
        ...(notes !== undefined && { notes }),
      },
    });
    res.json(vendor);
  } catch (error: any) {
    res.status(500).json({ message: "Error updating vendor", error: error.message });
  }
});

router.delete("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    await prisma.vendor.delete({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    res.json({ message: "Vendor deleted" });
  } catch (error: any) {
    if (error.code === "P2003") {
      return res.status(400).json({ message: "Cannot delete vendor — they have linked expenses. Remove those expenses first." });
    }
    res.status(500).json({ message: "Error deleting vendor", error: error.message });
  }
});

export default router;
