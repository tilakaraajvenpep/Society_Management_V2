import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();
router.use(authenticate);

// Default seeds per category
const DEFAULTS: Record<string, string[]> = {
  SERVICE_TYPE: ["Plumbing", "Electrical", "Carpentry", "Cleaning", "Security", "Pest Control", "Lift Maintenance", "Generator", "Painting", "Landscaping", "IT Services", "Legal", "Accounting", "Other"],
  DESIGNATION: ["President", "Secretary", "Treasurer", "Joint Secretary", "Joint Treasurer", "Committee Member", "Maintenance Staff"],
  EXPENSE_CATEGORY: ["Maintenance", "Repairs", "Utilities", "Security", "Cleaning", "Gardening", "Legal", "Accounting", "Events", "Equipment", "Other"],
};

// GET all masters for a category (auto-seed if empty)
router.get("/:category", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { category } = req.params;
  try {
    let items = await prisma.masterData.findMany({
      where: { tenantId: req.user.tenantId, category },
      orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    });

    // Auto-seed defaults if this category has no data yet
    if (items.length === 0 && DEFAULTS[category]) {
      const seeds = DEFAULTS[category].map((value, i) => ({
        tenantId: req.user.tenantId,
        category,
        value,
        sortOrder: i,
      }));
      await prisma.masterData.createMany({ data: seeds, skipDuplicates: true });
      items = await prisma.masterData.findMany({
        where: { tenantId: req.user.tenantId, category },
        orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
      });
    }

    res.json(items);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching masters", error: error.message });
  }
});

// POST add a new master value
router.post("/:category", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { category } = req.params;
  const { value } = req.body;
  if (!value?.trim()) return res.status(400).json({ message: "Value is required" });
  try {
    const maxOrder = await prisma.masterData.aggregate({
      where: { tenantId: req.user.tenantId, category },
      _max: { sortOrder: true },
    });
    const item = await prisma.masterData.create({
      data: {
        tenantId: req.user.tenantId,
        category,
        value: value.trim(),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    res.status(201).json(item);
  } catch (error: any) {
    if (error.code === "P2002") return res.status(400).json({ message: "This value already exists" });
    res.status(500).json({ message: "Error adding master value", error: error.message });
  }
});

// PATCH update a master value
router.patch("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { value, sortOrder } = req.body;
  try {
    const item = await prisma.masterData.update({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: {
        ...(value !== undefined && { value: value.trim() }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });
    res.json(item);
  } catch (error: any) {
    if (error.code === "P2002") return res.status(400).json({ message: "This value already exists" });
    res.status(500).json({ message: "Error updating master value", error: error.message });
  }
});

// DELETE a master value
router.delete("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    await prisma.masterData.delete({
      where: { id: req.params.id, tenantId: req.user.tenantId },
    });
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting master value", error: error.message });
  }
});

export default router;
