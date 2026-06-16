import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();
router.use(authenticate);

router.get("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const expenses = await prisma.expense.findMany({
    where: { tenantId: req.user.tenantId },
    include: { vendor: true },
    orderBy: { date: "desc" },
  });
  res.json(expenses);
});

router.post("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { title, category, amount, date, vendorId, isRecurring, paymentType, notes, paidByMemberId, reimbursementType, paymentMode } = req.body;
  try {
    const expense = await prisma.$transaction(async (tx) => {
      const expAmount = parseFloat(amount.toString());
      
      const newExpense = await tx.expense.create({
        data: {
          title,
          category,
          amount: expAmount,
          date: new Date(date),
          vendorId: vendorId || null,
          isRecurring: !!isRecurring,
          paymentType: paymentType || "ONE_TIME",
          notes: notes || null,
          tenantId: req.user.tenantId,
          paidByMemberId: paidByMemberId || null,
        },
        include: { vendor: true, member: true },
      });

      if (paidByMemberId) {
        if (reimbursementType === 'OFFSET_DUES') {
          // Adjust Member's outstanding dues. We decrease dues (creates negative balance meaning society owes them)
          await tx.member.update({
            where: { id: paidByMemberId },
            data: { outstandingDues: { decrement: expAmount } }
          });
          
          // Log an adjustment payment for record keeping
          const count = await tx.payment.count({ where: { tenantId: req.user.tenantId } });
          await tx.payment.create({
            data: {
              memberId: paidByMemberId,
              amount: expAmount,
              mode: "ADJUSTMENT",
              notes: `Offset against expense: ${title}`,
              tenantId: req.user.tenantId,
              collectedById: req.user.id,
              receiptNumber: `ADJ-${(count + 1).toString().padStart(4, '0')}`,
              handoverStatus: "HANDED_OVER",
              periodLabel: "Expense Offset"
            }
          });
        } else if (reimbursementType === 'CASH') {
          // Reimburse from Treasurer's Cash Balance
          await tx.cashBalance.upsert({
            where: { userId: req.user.id },
            update: { balance: { decrement: expAmount } },
            create: { userId: req.user.id, balance: -expAmount }
          });
        }
      } else {
        // Expense paid directly by society
        // If paid in cash, deduct from the treasurer's cash in hand
        const mode = (paymentMode || 'CASH').toUpperCase();
        if (mode === 'CASH') {
          await tx.cashBalance.upsert({
            where: { userId: req.user.id },
            update: { balance: { decrement: expAmount } },
            create: { userId: req.user.id, balance: -expAmount }
          });
        }
        // BANK mode: no CashBalance change needed (paid from bank account directly)
      }

      return newExpense;
    });

    res.json(expense);
  } catch (error: any) {
    console.error("Error adding expense:", error.message);
    res.status(500).json({ message: "Error adding expense", error: error.message });
  }
});

router.patch("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { title, category, amount, date, vendorId, notes, isRecurring, paymentType } = req.body;
  try {
    const expense = await prisma.expense.update({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: {
        ...(title !== undefined && { title }),
        ...(category !== undefined && { category }),
        ...(amount !== undefined && { amount: parseFloat(amount.toString()) }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(isRecurring !== undefined && { isRecurring: !!isRecurring }),
        ...(paymentType !== undefined && { paymentType }),
      },
      include: { vendor: true },
    });
    res.json(expense);
  } catch (error: any) {
    console.error("Error updating expense:", error.message);
    res.status(500).json({ message: "Error updating expense", error: error.message });
  }
});

router.delete("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id, tenantId: req.user.tenantId } });
    res.json({ message: "Expense deleted" });
  } catch (error: any) {
    res.status(500).json({ message: "Error deleting expense", error: error.message });
  }
});

export default router;
