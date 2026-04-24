import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();

router.use(authenticate);

// Get cash in hand for all admins in the tenant
router.get("/in-hand", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const balances = await prisma.cashBalance.findMany({
      where: { user: { tenantId: req.user.tenantId } },
      include: { user: { select: { name: true } } }
    });

    const result = balances.map(b => ({
      userId: b.userId,
      userName: b.user.name,
      balance: b.balance
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cash balances", error });
  }
});

// Get pending transfers for current user
router.get("/pending", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const pending = await prisma.cashTransaction.findMany({
      where: { toAdminId: req.user.id, status: "PENDING" },
      include: { fromAdmin: { select: { name: true } } }
    });
    res.json(pending);
  } catch (error) {
    res.status(500).json({ message: "Error fetching pending transfers", error });
  }
});

// Handover cash to another admin or bank
router.post("/transfer", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { toAdminId, amount, type, referenceNote } = req.body;

  try {
    // Check if user has enough balance
    const userBalance = await prisma.cashBalance.findUnique({
      where: { userId: req.user.id }
    });

    if (!userBalance || userBalance.balance < amount) {
      return res.status(400).json({ message: "Insufficient cash in hand" });
    }

    const transaction = await prisma.cashTransaction.create({
      data: {
        tenantId: req.user.tenantId,
        fromAdminId: req.user.id,
        toAdminId: type === "HANDOVER" ? toAdminId : null,
        amount,
        type,
        status: type === "HANDOVER" ? "PENDING" : "COMPLETED",
        referenceNote,
      },
    });

    // If it's a bank deposit, it's completed immediately
    if (type === "DEPOSIT") {
      await prisma.cashBalance.update({
        where: { userId: req.user.id },
        data: { balance: { decrement: amount } }
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: `CASH_${type}_INITIATED`,
        performedBy: req.user.name,
        referenceId: transaction.id,
        details: `${type} of ${amount} initiated by ${req.user.name}`,
      },
    });

    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: "Error transferring cash", error });
  }
});

// Approve a transfer
router.post("/approve/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.cashTransaction.findUnique({
        where: { id: req.params.id },
        include: { fromAdmin: true }
      });

      if (!transaction || transaction.status !== "PENDING" || transaction.toAdminId !== req.user.id) {
        throw new Error("Invalid transaction or already processed");
      }

      // Update balances
      await tx.cashBalance.update({
        where: { userId: transaction.fromAdminId },
        data: { balance: { decrement: transaction.amount } }
      });

      await tx.cashBalance.upsert({
        where: { userId: req.user.id },
        update: { balance: { increment: transaction.amount } },
        create: { userId: req.user.id, balance: transaction.amount }
      });

      // Mark transaction as APPROVED
      return await tx.cashTransaction.update({
        where: { id: req.params.id },
        data: { status: "APPROVED" }
      });
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
