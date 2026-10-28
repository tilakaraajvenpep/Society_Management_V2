import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";
import { notifyMember } from "../utils/notification";

const router = express.Router();

router.use(authenticate);

router.post("/", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { memberId, amount, mode, notes, subscriptionId, paidMonths, periodLabel, coverageStartDate, coverageEndDate, paymentDate, ledgerDate, category, lateFee, discount } = req.body;
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
          lateFee: lateFee ? parseFloat(lateFee.toString()) : 0,
          discount: discount ? parseFloat(discount.toString()) : 0,
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
      const baseDuesPortion = parseFloat(amount.toString()) - (lateFee ? parseFloat(lateFee.toString()) : 0) + (discount ? parseFloat(discount.toString()) : 0);
      await tx.member.update({
        where: { id: memberId },
        data: { 
          outstandingDues: { decrement: baseDuesPortion },
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
  const { amount, periodLabel, paidMonths, coverageStartDate, coverageEndDate, memberId, lateFee, discount } = req.body;

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
          lateFee: lateFee ? parseFloat(lateFee.toString()) : 0,
          discount: discount ? parseFloat(discount.toString()) : 0,
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
      const baseDuesPortion = parseFloat(amount.toString()) - (lateFee ? parseFloat(lateFee.toString()) : 0) + (discount ? parseFloat(discount.toString()) : 0);
      await tx.member.update({
        where: { id: memberId },
        data: {
          outstandingDues: { decrement: baseDuesPortion },
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
    memberId,
    lateFee,
    discount
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
          lateFee: lateFee ? parseFloat(lateFee.toString()) : 0,
          discount: discount ? parseFloat(discount.toString()) : 0,
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
      const baseDuesPortion = parseFloat(amount.toString()) - (lateFee ? parseFloat(lateFee.toString()) : 0) + (discount ? parseFloat(discount.toString()) : 0);
      await tx.member.update({
        where: { id: memberId },
        data: {
          outstandingDues: { decrement: baseDuesPortion },
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

// Member submits a bank transfer payment
router.post("/bank-transfer", async (req: any, res) => {
  const {
    amount,
    periodLabel,
    paidMonths,
    coverageStartDate,
    coverageEndDate,
    referenceNumber,
    proofUrl,
    notes,
    lateFee,
    discount,
    memberId: explicitMemberId
  } = req.body;

  try {
    let memberId = explicitMemberId;
    if (!memberId && req.user?.id) {
      const member = await prisma.member.findFirst({
        where: {
          OR: [
            { userId: req.user.id },
            { secondaryUserId: req.user.id }
          ]
        }
      });
      if (member) memberId = member.id;
    }

    if (!memberId) {
      return res.status(400).json({ message: "Member identification is required." });
    }

    const currentMember = await prisma.member.findUnique({
      where: { id: memberId },
      include: { tenant: true }
    });

    if (!currentMember) {
      return res.status(404).json({ message: "Member record not found." });
    }

    const tenant = currentMember.tenant;
    // Check compulsory policy fixed by admin
    if (tenant?.bankReferenceRequired && (!referenceNumber || !referenceNumber.trim())) {
      return res.status(400).json({ message: "Transaction reference number is compulsory according to society policy." });
    }
    if (tenant?.bankProofRequired && (!proofUrl || !proofUrl.trim())) {
      return res.status(400).json({ message: "Payment proof / screenshot is compulsory according to society policy." });
    }

    const monthsToAdd = parseInt(paidMonths) || 1;
    const finalAmount = parseFloat(amount.toString());

    // Find Treasurer or Tenant Admin to assign as tentative collector/admin contact
    const collector = await prisma.user.findFirst({
      where: {
        tenantId: currentMember.tenantId,
        designation: "Treasurer"
      }
    }) || await prisma.user.findFirst({
      where: {
        tenantId: currentMember.tenantId,
        role: "TENANT_ADMIN"
      }
    });

    const payment = await prisma.payment.create({
      data: {
        memberId,
        amount: finalAmount,
        lateFee: lateFee ? parseFloat(lateFee.toString()) : 0,
        discount: discount ? parseFloat(discount.toString()) : 0,
        mode: "BANK_TRANSFER" as any,
        referenceNumber: referenceNumber?.trim() || null,
        proofUrl: proofUrl?.trim() || null,
        notes: notes || "Bank transfer awaiting verification",
        status: "PENDING" as any,
        tenantId: currentMember.tenantId,
        collectedById: collector?.id || req.user.id,
        handoverStatus: "TRANSFERRED_TO_BANK",
        paidMonths: monthsToAdd,
        periodLabel: periodLabel || `${monthsToAdd} Month(s) Maintenance`,
        paymentDate: new Date(),
        coverageStartDate: coverageStartDate ? new Date(coverageStartDate) : null,
        coverageEndDate: coverageEndDate ? new Date(coverageEndDate) : null,
        category: "Maintenance",
      }
    });

    // Create Audit Log
    const memberLabel = `${currentMember.name} (Flat ${currentMember.flatNo})`;
    await prisma.auditLog.create({
      data: {
        tenantId: currentMember.tenantId,
        actionType: "BANK_TRANSFER_SUBMITTED",
        performedBy: currentMember.name,
        referenceId: payment.id,
        details: `Bank transfer of ₹${finalAmount} submitted by ${memberLabel}. Ref: ${referenceNumber || 'N/A'}. Awaiting approval.`,
      },
    });

    // Notify Treasurers and Admins
    const admins = await prisma.user.findMany({
      where: {
        tenantId: currentMember.tenantId,
        OR: [
          { designation: "Treasurer" },
          { role: "TENANT_ADMIN" }
        ]
      },
      select: { id: true }
    });

    const notificationsData = admins.map((a) => ({
      tenantId: currentMember.tenantId,
      userId: a.id,
      title: "Bank Transfer Payment Submitted",
      message: `Member ${currentMember.name} (Flat ${currentMember.flatNo}) submitted ₹${finalAmount} via Bank Transfer (${payment.periodLabel}). Ref: ${referenceNumber || 'N/A'}. Please review and approve.`,
      type: "PAYMENT",
      link: "/tenant-admin?tab=payments"
    }));

    if (notificationsData.length > 0) {
      await prisma.notification.createMany({ data: notificationsData });
    }

    res.status(201).json(payment);
  } catch (error: any) {
    console.error("Error submitting bank transfer:", error);
    res.status(500).json({ message: "Error submitting bank transfer", error: error.message });
  }
});

// Admin gets all pending bank transfers
router.get("/pending-transfers", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  try {
    const pendings = await prisma.payment.findMany({
      where: {
        tenantId: req.user.tenantId,
        status: "PENDING"
      },
      include: {
        member: true
      },
      orderBy: { paymentDate: "desc" }
    });
    res.json(pendings);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching pending transfers", error: error.message });
  }
});

// Admin approves a pending payment
router.post("/:id/approve", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { id } = req.params;
  try {
    const payment = await prisma.payment.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { member: true }
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found." });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({ message: `Payment is currently ${payment.status}, cannot approve.` });
    }

    const currentMember = payment.member;

    const approvedPayment = await prisma.$transaction(async (tx) => {
      // Generate sequential receipt number
      const count = await tx.payment.count({ 
        where: { tenantId: req.user.tenantId, status: "PAID" } 
      });
      const receiptNumber = `REC-${(count + 1).toString().padStart(4, '0')}`;

      const updated = await tx.payment.update({
        where: { id },
        data: {
          status: "PAID",
          receiptNumber,
          approvedAt: new Date(),
          approvedById: req.user.id,
          collectedById: req.user.id,
        }
      });

      // Calculate new paidUntil date
      let newPaidUntil = currentMember?.paidUntil ? new Date(currentMember.paidUntil) : new Date();
      if (!currentMember?.paidUntil) {
        newPaidUntil.setDate(1);
        newPaidUntil.setHours(0, 0, 0, 0);
      }

      if (payment.coverageEndDate) {
        const proposed = new Date(payment.coverageEndDate);
        if (proposed > newPaidUntil) {
          newPaidUntil = proposed;
        }
      } else {
        newPaidUntil.setMonth(newPaidUntil.getMonth() + (payment.paidMonths || 1));
      }

      // Update member outstandingDues and paidUntil
      const baseDuesPortion = payment.amount - (payment.lateFee || 0) + (payment.discount || 0);
      await tx.member.update({
        where: { id: payment.memberId },
        data: {
          outstandingDues: { decrement: baseDuesPortion },
          paidUntil: newPaidUntil
        }
      });

      return updated;
    });

    // Create Audit Log
    const memberLabel = currentMember ? `${currentMember.name} (Flat ${currentMember.flatNo})` : payment.memberId;
    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "PAYMENT_APPROVED",
        performedBy: req.user.name,
        referenceId: approvedPayment.id,
        details: `${approvedPayment.receiptNumber}: Bank transfer of ₹${payment.amount} approved for ${memberLabel} by ${req.user.name}.`,
      },
    });

    // Notify member with redirect link to their receipts
    await notifyMember({
      tenantId: req.user.tenantId,
      memberId: payment.memberId,
      title: "Bank Transfer Payment Approved",
      message: `Your bank transfer payment of ₹${payment.amount} (${payment.periodLabel}) has been approved! Receipt: ${approvedPayment.receiptNumber}.`,
      type: "PAYMENT",
      link: "/member?tab=receipts"
    });

    res.json(approvedPayment);
  } catch (error: any) {
    console.error("Error approving payment:", error);
    res.status(500).json({ message: "Error approving payment", error: error.message });
  }
});

// Admin denies a pending payment
router.post("/:id/deny", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { id } = req.params;
  const { rejectionReason } = req.body;

  if (!rejectionReason || !rejectionReason.trim()) {
    return res.status(400).json({ message: "Admin notes / reason for rejection is required." });
  }

  try {
    const payment = await prisma.payment.findFirst({
      where: { id, tenantId: req.user.tenantId },
      include: { member: true }
    });

    if (!payment) {
      return res.status(404).json({ message: "Payment record not found." });
    }

    if (payment.status !== "PENDING") {
      return res.status(400).json({ message: `Payment is currently ${payment.status}, cannot deny.` });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: "CANCELLED",
        rejectionReason: rejectionReason.trim(),
      }
    });

    // Audit Log
    const memberLabel = payment.member ? `${payment.member.name} (Flat ${payment.member.flatNo})` : payment.memberId;
    await prisma.auditLog.create({
      data: {
        tenantId: req.user.tenantId,
        actionType: "PAYMENT_DENIED",
        performedBy: req.user.name,
        referenceId: payment.id,
        details: `Bank transfer payment of ₹${payment.amount} for ${memberLabel} was rejected by ${req.user.name}. Reason: ${rejectionReason.trim()}`,
      },
    });

    // Notify member with redirect link to their payments tab
    await notifyMember({
      tenantId: req.user.tenantId,
      memberId: payment.memberId,
      title: "Bank Transfer Payment Denied",
      message: `Your payment of ₹${payment.amount} was rejected by society administration. Note: ${rejectionReason.trim()}`,
      type: "PAYMENT",
      link: "/member?tab=payments"
    });

    res.json(updated);
  } catch (error: any) {
    console.error("Error denying payment:", error);
    res.status(500).json({ message: "Error denying payment", error: error.message });
  }
});

// Printable / Downloadable Official Receipt HTML page
router.get("/:id/receipt-html", async (req: any, res) => {
  const { id } = req.params;
  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        member: true,
        tenant: true
      }
    });

    if (!payment) {
      return res.status(404).send("<h2 style='font-family:sans-serif;text-align:center;margin-top:50px;'>Receipt not found</h2>");
    }

    // Security check: if user is member, ensure it's their payment
    if (req.user && req.user.role === "MEMBER") {
      const isOwner = payment.member?.userId === req.user.id || payment.member?.secondaryUserId === req.user.id;
      if (!isOwner) {
        return res.status(403).send("<h2 style='font-family:sans-serif;text-align:center;margin-top:50px;'>Access Denied</h2>");
      }
    }

    const tenant: any = payment.tenant || {};
    const member: any = payment.member || {};
    const lateFee = payment.lateFee || 0;
    const discount = payment.discount || 0;
    const baseAmount = payment.amount - lateFee + discount;
    const paymentDateStr = payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) : "-";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${payment.receiptNumber || 'SocietyArena'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
    }
    .action-bar {
      width: 100%;
      max-width: 600px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 16px;
    }
    .btn {
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:hover { background: #1d4ed8; }
    .receipt-box {
      width: 100%;
      max-width: 600px;
      background: #ffffff;
      border-radius: 16px;
      padding: 32px 28px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      text-align: center;
      border-bottom: 2px dashed #cbd5e1;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .society-name {
      font-size: 22px;
      font-weight: 800;
      color: #1e3a8a;
      margin-bottom: 4px;
    }
    .society-addr {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 12px;
    }
    .badge-receipt {
      display: inline-block;
      background: #eff6ff;
      color: #2563eb;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.2px;
      padding: 4px 12px;
      border-radius: 999px;
      border: 1px solid #bfdbfe;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; }
    .meta-value { font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px; }
    .table-details {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      margin-bottom: 20px;
    }
    .table-details td {
      padding: 10px 0;
      font-size: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .table-details td:last-child {
      text-align: right;
      font-weight: 600;
    }
    .total-row td {
      border-top: 2px solid #e2e8f0;
      border-bottom: none;
      padding-top: 14px;
      font-size: 18px;
      font-weight: 800;
      color: #1e3a8a;
    }
    .stamp {
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
      color: #059669;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.8px;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .action-bar { display: none !important; }
      .receipt-box { box-shadow: none; border: 1px solid #ccc; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <button class="btn btn-primary" onclick="window.print()">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="receipt-box" id="receipt">
    <div class="header">
      <div class="society-name">${tenant.name || 'Society Management'}</div>
      <div class="society-addr">${tenant.address || 'Resident Housing Society'}</div>
      <div class="badge-receipt">OFFICIAL PAYMENT RECEIPT</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-label">Receipt Number</span>
        <span class="meta-value">${payment.receiptNumber || 'REC-' + payment.id.slice(-6).toUpperCase()}</span>
      </div>
      <div class="meta-item" style="text-align: right;">
        <span class="meta-label">Payment Date</span>
        <span class="meta-value">${paymentDateStr}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Received From</span>
        <span class="meta-value">${member.name || '-'}</span>
      </div>
      <div class="meta-item" style="text-align: right;">
        <span class="meta-label">Flat / Unit</span>
        <span class="meta-value">Flat ${member.flatNo || '-'}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Payment Mode</span>
        <span class="meta-value">${payment.mode || 'ONLINE'}</span>
      </div>
      <div class="meta-item" style="text-align: right;">
        <span class="meta-label">Period Covered</span>
        <span class="meta-value">${payment.periodLabel || payment.paidMonths + ' Month(s)'}</span>
      </div>
      ${payment.referenceNumber ? `
      <div class="meta-item" style="grid-column: span 2;">
        <span class="meta-label">UTR / Reference Number</span>
        <span class="meta-value" style="font-family: monospace;">${payment.referenceNumber}</span>
      </div>
      ` : ''}
    </div>

    <table class="table-details">
      <tr>
        <td>Base Maintenance Amount</td>
        <td>₹${baseAmount.toLocaleString('en-IN')}</td>
      </tr>
      ${discount > 0 ? `
      <tr style="color: #059669;">
        <td>Early Bird Discount</td>
        <td>- ₹${discount.toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      ${lateFee > 0 ? `
      <tr style="color: #dc2626;">
        <td>Late Fee / Surcharge</td>
        <td>+ ₹${lateFee.toLocaleString('en-IN')}</td>
      </tr>
      ` : ''}
      <tr class="total-row">
        <td>Total Amount Paid</td>
        <td>₹${payment.amount.toLocaleString('en-IN')}</td>
      </tr>
    </table>

    <div class="stamp">
      ✓ OFFICIALLY VERIFIED & APPROVED
    </div>

    <div class="footer">
      Generated automatically by SocietyArena • This is a computer-generated receipt and requires no physical signature.
    </div>
  </div>
  ${req.query?.autoPrint === 'true' ? '<script>window.onload = function() { window.print(); };</script>' : ''}
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error: any) {
    console.error("Error generating receipt HTML:", error);
    res.status(500).send("Error generating receipt: " + error.message);
  }
});

export default router;
