import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { notifyMember } from "../utils/notification";

const router = express.Router();

router.use(authenticate);

router.post("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { memberId, amount, mode, notes, subscriptionId, paidMonths, periodLabel, coverageStartDate, coverageEndDate, paymentDate, ledgerDate, category } = req.body;
  try {
    // Fetch member name and current paidUntil
    const currentMember = await prisma.member.findUnique({ where: { id: memberId }, select: { name: true, flatNo: true, paidUntil: true } });
    const memberLabel = currentMember ? `${currentMember.name} (Flat ${currentMember.flatNo})` : memberId;

    const payment = await prisma.$transaction(async (tx) => {
      const count = await tx.payment.count({ where: { tenantId: req.user.tenantId } });
      const receiptNumber = `REC-${(count + 1).toString().padStart(4, '0')}`;

      const normalizedMode = (mode as string).toUpperCase();

      const monthsToAdd = parseInt(paidMonths) || 1;
      const label = periodLabel || (monthsToAdd === 1 ? 'Monthly' : monthsToAdd === 3 ? 'Quarterly' : monthsToAdd === 6 ? 'Half-Yearly' : monthsToAdd === 12 ? 'Annual' : `${monthsToAdd} Months`);

      const p = await tx.payment.create({
        data: {
          memberId,
          amount: parseFloat(amount.toString()),
          mode: normalizedMode as any,
          notes: notes || null,
          subscriptionId: subscriptionId || undefined,
          tenantId: req.user.tenantId,
          collectedById: req.user.id,
          receiptNumber,
          handoverStatus: normalizedMode === "CASH" ? "WITH_COLLECTOR" : "TRANSFERRED_TO_BANK",
          paidMonths: monthsToAdd,
          periodLabel: label,
          paymentDate: paymentDate ? new Date(paymentDate) : undefined,
          ledgerDate: ledgerDate ? new Date(ledgerDate) : null,
          coverageStartDate: coverageStartDate ? new Date(coverageStartDate) : null,
          coverageEndDate: coverageEndDate ? new Date(coverageEndDate) : null,
          category: category || "Maintenance",
        },
      });

      if (normalizedMode === "CASH") {
        await tx.cashBalance.upsert({
          where: { userId: req.user.id },
          update: { balance: { increment: parseFloat(amount.toString()) } },
          create: { userId: req.user.id, balance: parseFloat(amount.toString()) },
        });
      }

      // Calculate new paidUntil date
      let newPaidUntil = currentMember?.paidUntil ? new Date(currentMember.paidUntil) : new Date();
      if (!currentMember?.paidUntil) {
        newPaidUntil.setDate(1);
        newPaidUntil.setHours(0, 0, 0, 0);
      }
      
      if (coverageEndDate) {
        const proposed = new Date(coverageEndDate);
        if (proposed > newPaidUntil) {
          newPaidUntil = proposed;
        }
      } else {
        newPaidUntil.setMonth(newPaidUntil.getMonth() + monthsToAdd);
      }

      // Decrease member's outstandingDues and update paidUntil
      await tx.member.update({
        where: { id: memberId },
        data: { 
          outstandingDues: { decrement: parseFloat(amount.toString()) },
          paidUntil: newPaidUntil
        }
      });

      return p;
    });

    // Create audit log with readable member name
    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "PAYMENT_CREATED",
        performedBy: req.user.name,
        referenceId: payment.id,
        details: `${payment.receiptNumber}: ₹${amount} collected from ${memberLabel} via ${payment.mode} (${payment.periodLabel})`,
      },
    });

    await notifyMember({
      tenantId: req.user.tenantId,
      memberId,
      title: "Payment Received",
      message: `We have received your payment of ₹${amount} (${payment.periodLabel || ''}). Receipt: ${payment.receiptNumber}.`,
      type: "PAYMENT"
    });

    res.json(payment);
  } catch (error: any) {
    console.error("Error recording payment:", error);
    res.status(500).json({ message: "Error recording payment", error: error.message });
  }
});

router.get("/history", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const payments = await prisma.payment.findMany({
    where: { tenantId: req.user.tenantId },
    include: { member: true, collectedBy: true },
    orderBy: { paymentDate: "desc" },
  });
  res.json(payments);
});

router.get("/upcoming", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const now = new Date();
    const endOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const upcomingMembers = await prisma.member.findMany({
      where: {
        tenantId: req.user.tenantId,
        status: "ACTIVE",
        OR: [
          { paidUntil: null },
          { paidUntil: { lte: endOfThisMonth } },
          { outstandingDues: { gt: 0 } }
        ]
      },
      orderBy: { flatNo: 'asc' }
    });
    
    res.json(upcomingMembers);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching upcoming dues", error: error.message });
  }
});

router.patch("/:id", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { status, amount, mode, notes, coverageStartDate, coverageEndDate, paymentDate, ledgerDate, category } = req.body;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({
        where: { id: req.params.id, tenantId: req.user.tenantId }
      });

      if (!current) throw new Error("Payment not found");
      if (current.status === "CANCELLED") throw new Error("Already cancelled");

      let finalStatus = status || current.status;
      let finalAmount = amount !== undefined ? parseFloat(amount.toString()) : current.amount;
      let finalMode = mode ? (mode as string).toUpperCase() : current.mode;
      
      // Handle status cancellation
      if (status === "CANCELLED") {
        if (current.mode === "CASH") {
          await tx.cashBalance.update({
            where: { userId: current.collectedById },
            data: { balance: { decrement: current.amount } }
          });
        }
        await tx.member.update({
          where: { id: current.memberId },
          data: { outstandingDues: { increment: current.amount } }
        });
      } else {
        // If not cancelling, but updating amount and/or mode
        const amountDiff = finalAmount - current.amount;
        
        // Adjust cash balance based on mode switches/amount differences
        if (current.mode === "CASH" && finalMode !== "CASH") {
          // Changed from CASH to something else -> deduct the old amount
          await tx.cashBalance.update({
            where: { userId: current.collectedById },
            data: { balance: { decrement: current.amount } }
          });
        } else if (current.mode !== "CASH" && finalMode === "CASH") {
          // Changed from something else to CASH -> add the whole new amount
          await tx.cashBalance.upsert({
            where: { userId: current.collectedById },
            update: { balance: { increment: finalAmount } },
            create: { userId: current.collectedById, balance: finalAmount }
          });
        } else if (current.mode === "CASH" && finalMode === "CASH" && amountDiff !== 0) {
          // Stayed CASH but amount changed -> adjust by diff
          await tx.cashBalance.update({
            where: { userId: current.collectedById },
            data: { balance: { increment: amountDiff } }
          });
        }

        // Adjust member outstandingDues
        if (amountDiff !== 0) {
          await tx.member.update({
            where: { id: current.memberId },
            data: { outstandingDues: { decrement: amountDiff } }
          });
        }
      }

      // Prepare updated fields
      const updateData: any = {
        status: finalStatus as any,
        amount: finalAmount,
        mode: finalMode as any,
        notes: notes !== undefined ? notes : current.notes,
        category: category !== undefined ? category : current.category,
        lastEditedBy: req.user.name,
        lastEditedAt: new Date(),
      };

      if (paymentDate) {
        updateData.paymentDate = new Date(paymentDate);
      }
      if (ledgerDate !== undefined) {
        updateData.ledgerDate = ledgerDate ? new Date(ledgerDate) : null;
      }
      if (coverageStartDate !== undefined) {
        updateData.coverageStartDate = coverageStartDate ? new Date(coverageStartDate) : null;
      }
      if (coverageEndDate !== undefined) {
        updateData.coverageEndDate = coverageEndDate ? new Date(coverageEndDate) : null;
      }

      const updated = await tx.payment.update({
        where: { id: req.params.id },
        data: updateData
      });

      // Recalculate paidUntil for the member based on all active payments
      const activePayments = await tx.payment.findMany({
        where: {
          memberId: current.memberId,
          status: { not: "CANCELLED" }
        },
        orderBy: { coverageEndDate: "desc" }
      });
      
      let maxCoverageEndDate: Date | null = null;
      for (const pay of activePayments) {
        if (pay.coverageEndDate) {
          const d = new Date(pay.coverageEndDate);
          if (!maxCoverageEndDate || d > maxCoverageEndDate) {
            maxCoverageEndDate = d;
          }
        }
      }
      
      await tx.member.update({
        where: { id: current.memberId },
        data: { paidUntil: maxCoverageEndDate }
      });

      return updated;
    });

    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: status === "CANCELLED" ? "PAYMENT_CANCELLED" : "PAYMENT_UPDATED",
        performedBy: req.user.name,
        referenceId: result.id,
        details: `Payment ${result.receiptNumber} ${status === "CANCELLED" ? 'cancelled' : 'updated'}. ${amount ? `New amount: ${amount}` : ''}`,
      }
    });

    await notifyMember({
      tenantId: req.user.tenantId,
      memberId: result.memberId,
      title: status === "CANCELLED" ? "Payment Cancelled" : "Payment Updated",
      message: status === "CANCELLED" 
        ? `Your payment of ₹${result.amount} (Receipt: ${result.receiptNumber}) has been cancelled.`
        : `Your payment record (Receipt: ${result.receiptNumber}) has been updated. New amount: ₹${result.amount}.`,
      type: "PAYMENT"
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Error updating payment", error });
  }
});

// TEST ONLY: Simulate a completed Razorpay payment without actual transaction
router.post("/razorpay/test-payment-done", async (req: any, res) => {
  const { amount, periodLabel, paidMonths, coverageStartDate, coverageEndDate, memberId } = req.body;

  try {
    const currentMember = await prisma.member.findUnique({
      where: { id: memberId },
      select: { name: true, flatNo: true, paidUntil: true, tenantId: true }
    });

    if (!currentMember) {
      return res.status(404).json({ message: "Member not found" });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const count = await tx.payment.count({ where: { tenantId: currentMember.tenantId } });
      const receiptNumber = `REC-${(count + 1).toString().padStart(4, '0')}`;

      // Find Treasurer or Tenant Admin to act as collector reference
      const collector = await tx.user.findFirst({
        where: { tenantId: currentMember.tenantId, designation: "Treasurer" }
      }) || await tx.user.findFirst({
        where: { tenantId: currentMember.tenantId, role: "TENANT_ADMIN" }
      });

      if (!collector) {
        throw new Error("No society administrator found to associate payment with.");
      }

      const monthsToAdd = parseInt(paidMonths) || 1;

      const p = await tx.payment.create({
        data: {
          memberId,
          amount: parseFloat(amount.toString()),
          mode: "UPI",
          notes: `[TEST MODE] Payment marked as done manually. Simulated Razorpay payment for testing purposes.`,
          tenantId: currentMember.tenantId,
          collectedById: collector.id,
          receiptNumber,
          handoverStatus: "TRANSFERRED_TO_BANK",
          paidMonths: monthsToAdd,
          periodLabel: periodLabel || "Online Maintenance Payment",
          paymentDate: new Date(),
          coverageStartDate: coverageStartDate ? new Date(coverageStartDate) : null,
          coverageEndDate: coverageEndDate ? new Date(coverageEndDate) : null,
          category: "Maintenance",
        },
      });

      // Calculate new paidUntil date
      let newPaidUntil = currentMember.paidUntil ? new Date(currentMember.paidUntil) : new Date();
      if (!currentMember.paidUntil) {
        newPaidUntil.setDate(1);
        newPaidUntil.setHours(0, 0, 0, 0);
      }

      if (coverageEndDate) {
        const proposed = new Date(coverageEndDate);
        if (proposed > newPaidUntil) {
          newPaidUntil = proposed;
        }
      } else {
        newPaidUntil.setMonth(newPaidUntil.getMonth() + monthsToAdd);
      }

      // Decrease member's outstandingDues and update paidUntil
      await tx.member.update({
        where: { id: memberId },
        data: {
          outstandingDues: { decrement: parseFloat(amount.toString()) },
          paidUntil: newPaidUntil
        }
      });

      return p;
    });

    // Create Audit Log
    const memberLabel = `${currentMember.name} (Flat ${currentMember.flatNo})`;
    await prisma.auditLog.create({
      data: {
        tenantId: currentMember.tenantId,
        actionType: "PAYMENT_CREATED",
        performedBy: currentMember.name,
        referenceId: payment.id,
        details: `[TEST] ${payment.receiptNumber}: ₹${amount} marked as paid (test mode) by ${memberLabel} (${payment.periodLabel})`,
      },
    });

    // Notify member
    await notifyMember({
      tenantId: currentMember.tenantId,
      memberId,
      title: "Payment Confirmed",
      message: `Your payment of ₹${amount} (${payment.periodLabel}) has been recorded. Receipt: ${payment.receiptNumber}.`,
      type: "PAYMENT"
    });

    // Notify ONLY Treasurers
    const treasurers = await prisma.user.findMany({
      where: {
        tenantId: currentMember.tenantId,
        designation: "Treasurer"
      },
      select: { id: true }
    });

    // If no treasurer found, fallback to TENANT_ADMIN
    const recipients = treasurers.length > 0 ? treasurers : await prisma.user.findMany({
      where: { tenantId: currentMember.tenantId, role: "TENANT_ADMIN" },
      select: { id: true }
    });

    const notificationsData = recipients.map((t) => ({
      tenantId: currentMember.tenantId,
      userId: t.id,
      title: "🧾 Online Payment Received [Test Mode]",
      message: `Member ${currentMember.name} (Flat ${currentMember.flatNo}) paid ₹${amount} online (test mode) for ${periodLabel}. Receipt: ${payment.receiptNumber}.`,
      type: "PAYMENT"
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
    }

    res.json(payment);
  } catch (error: any) {
    console.error("Error recording test payment:", error);
    res.status(500).json({ message: "Error recording test payment", error: error.message });
  }
});

router.post("/razorpay/order", async (req: any, res) => {
  const { amount } = req.body;
  try {
    const Razorpay = require("razorpay");
    const instance = new Razorpay({
      key_id: "rzp_test_xDp4iQDpmrSjsL",
      key_secret: "mDLxFCfBNzBwpR33RliORFIN",
    });

    const options = {
      amount: Math.round(parseFloat(amount.toString()) * 100), // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await instance.orders.create(options);
    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: "rzp_test_xDp4iQDpmrSjsL",
    });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ message: "Error creating Razorpay order", error: error.message });
  }
});

router.post("/razorpay/verify", async (req: any, res) => {
  const {
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature,
    amount,
    periodLabel,
    paidMonths,
    coverageStartDate,
    coverageEndDate,
    memberId
  } = req.body;

  try {
    const crypto = require("crypto");
    const text = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", "mDLxFCfBNzBwpR33RliORFIN")
      .update(text)
      .digest("hex");

    const isValid = expectedSignature === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Process payment in a transaction
    const currentMember = await prisma.member.findUnique({
      where: { id: memberId },
      select: { name: true, flatNo: true, paidUntil: true, tenantId: true }
    });

    if (!currentMember) {
      return res.status(404).json({ message: "Member not found" });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const count = await tx.payment.count({ where: { tenantId: currentMember.tenantId } });
      const receiptNumber = `REC-${(count + 1).toString().padStart(4, '0')}`;

      // Find Treasurer or Tenant Admin to act as collector reference
      const collector = await tx.user.findFirst({
        where: {
          tenantId: currentMember.tenantId,
          designation: "Treasurer"
        }
      }) || await tx.user.findFirst({
        where: {
          tenantId: currentMember.tenantId,
          role: "TENANT_ADMIN"
        }
      });

      if (!collector) {
        throw new Error("No society administrator found to associate payment with.");
      }

      const monthsToAdd = parseInt(paidMonths) || 1;

      const p = await tx.payment.create({
        data: {
          memberId,
          amount: parseFloat(amount.toString()),
          mode: "UPI", // UPI mode is compatible with Enum
          notes: `Paid online via Razorpay. Payment ID: ${razorpay_payment_id}`,
          tenantId: currentMember.tenantId,
          collectedById: collector.id,
          receiptNumber,
          handoverStatus: "TRANSFERRED_TO_BANK",
          paidMonths: monthsToAdd,
          periodLabel: periodLabel || "Online Maintenance Payment",
          paymentDate: new Date(),
          coverageStartDate: coverageStartDate ? new Date(coverageStartDate) : null,
          coverageEndDate: coverageEndDate ? new Date(coverageEndDate) : null,
          category: "Maintenance",
        },
      });

      // Calculate new paidUntil date
      let newPaidUntil = currentMember.paidUntil ? new Date(currentMember.paidUntil) : new Date();
      if (!currentMember.paidUntil) {
        newPaidUntil.setDate(1);
        newPaidUntil.setHours(0, 0, 0, 0);
      }

      if (coverageEndDate) {
        const proposed = new Date(coverageEndDate);
        if (proposed > newPaidUntil) {
          newPaidUntil = proposed;
        }
      } else {
        newPaidUntil.setMonth(newPaidUntil.getMonth() + monthsToAdd);
      }

      // Decrease member's outstandingDues and update paidUntil
      await tx.member.update({
        where: { id: memberId },
        data: {
          outstandingDues: { decrement: parseFloat(amount.toString()) },
          paidUntil: newPaidUntil
        }
      });

      return p;
    });

    // Create Audit Log
    const memberLabel = `${currentMember.name} (Flat ${currentMember.flatNo})`;
    await prisma.auditLog.create({
      data: {
        tenantId: currentMember.tenantId,
        actionType: "PAYMENT_CREATED",
        performedBy: currentMember.name,
        referenceId: payment.id,
        details: `${payment.receiptNumber}: ₹${amount} paid online by ${memberLabel} via Razorpay (${payment.periodLabel})`,
      },
    });

    // Notify member
    await notifyMember({
      tenantId: currentMember.tenantId,
      memberId,
      title: "Online Payment Successful",
      message: `Your online payment of ₹${amount} (${payment.periodLabel}) has been processed successfully. Receipt: ${payment.receiptNumber}.`,
      type: "PAYMENT"
    });

    // Notify Treasurers and Tenant Admins
    const treasurers = await prisma.user.findMany({
      where: {
        tenantId: currentMember.tenantId,
        OR: [
          { designation: "Treasurer" },
          { role: "TENANT_ADMIN" }
        ]
      },
      select: { id: true }
    });

    const notificationsData = treasurers.map((t) => ({
      tenantId: currentMember.tenantId,
      userId: t.id,
      title: "Online Payment Received",
      message: `Member ${currentMember.name} (Flat ${currentMember.flatNo}) paid ₹${amount} online via Razorpay for ${periodLabel}.`,
      type: "PAYMENT"
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({
        data: notificationsData
      });
    }

    res.json(payment);
  } catch (error: any) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Error verifying payment", error: error.message });
  }
});

export default router;
