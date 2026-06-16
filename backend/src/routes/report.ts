import express from "express";
import prisma from "../utils/prisma";
import { authenticate, authorize } from "../middleware/auth";

const router = express.Router();
router.use(authenticate);

router.get("/summary", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const { tenantId } = req.user;

  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // --- Totals ---
    const [totalIncomeAgg, totalExpensesAgg, outstandingAgg, tenantInfo] = await Promise.all([
      prisma.payment.aggregate({ where: { tenantId, status: { not: 'CANCELLED' } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { tenantId }, _sum: { amount: true } }),
      prisma.member.aggregate({ where: { tenantId }, _sum: { outstandingDues: true } }),
      prisma.tenant.findUnique({ 
        where: { id: tenantId }, 
        select: { 
          maintenanceAmount: true, 
          quarterlyAmount: true, 
          halfYearlyAmount: true, 
          annualAmount: true,
          enableForums: true
        } as any 
      }),
    ]);

    // --- This month vs last month ---
    const [thisMonthIncome, lastMonthIncome, thisMonthExpenses, lastMonthExpenses] = await Promise.all([
      prisma.payment.aggregate({ where: { tenantId, status: { not: 'CANCELLED' }, paymentDate: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { tenantId, status: { not: 'CANCELLED' }, paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { tenantId, date: { gte: startOfMonth } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { tenantId, date: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
    ]);

    // --- Cash in hand (derived from first principles for accuracy) ---
    // Formula: CASH collected − Society-paid expenses − Bank deposits
    const [cashPaymentsAgg, societyExpensesAgg, bankDepositsAgg] = await Promise.all([
      // Total cash received from members (excluding cancelled)
      prisma.payment.aggregate({
        where: { tenantId, mode: 'CASH', status: { not: 'CANCELLED' } },
        _sum: { amount: true }
      }),
      // Total expenses paid directly by society (not by a member)
      prisma.expense.aggregate({
        where: { tenantId, paidByMemberId: null },
        _sum: { amount: true }
      }),
      // Total cash deposited to bank
      prisma.cashTransaction.aggregate({
        where: { tenantId, type: 'DEPOSIT', status: 'COMPLETED' },
        _sum: { amount: true }
      }),
    ]);

    const totalCashCollected = cashPaymentsAgg._sum.amount || 0;
    const totalSocietyExpenses = societyExpensesAgg._sum.amount || 0;
    const totalDeposited = bankDepositsAgg._sum.amount || 0;
    const totalCashInHand = Math.max(0, totalCashCollected - totalSocietyExpenses - totalDeposited);

    // --- Expense breakdown by category ---
    const expenseByCategory = await prisma.expense.groupBy({
      by: ["category"],
      where: { tenantId },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    });

    // --- Monthly trends: last 6 months ---
    const monthlyData: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const label = mStart.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      const [inc, exp] = await Promise.all([
        prisma.payment.aggregate({ where: { tenantId, status: { not: 'CANCELLED' }, paymentDate: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { tenantId, date: { gte: mStart, lte: mEnd } }, _sum: { amount: true } }),
      ]);
      monthlyData.push({ month: label, income: inc._sum.amount || 0, expenses: exp._sum.amount || 0, net: (inc._sum.amount || 0) - (exp._sum.amount || 0) });
    }

    // --- Recent payments (last 5) ---
    const recentPayments = await prisma.payment.findMany({
      where: { tenantId },
      include: { member: { select: { name: true, flatNo: true } } },
      orderBy: { paymentDate: "desc" },
      take: 5,
    });

    // --- Members summary ---
    const [totalMembers, membersWithDues] = await Promise.all([
      prisma.member.count({ where: { tenantId } }),
      prisma.member.count({ where: { tenantId, outstandingDues: { gt: 0 } } }),
    ]);

    const totalIncome = totalIncomeAgg._sum.amount || 0;
    const totalExpenses = totalExpensesAgg._sum.amount || 0;
    const totalNonCashCollected = totalIncome - totalCashCollected;

    res.json({
      // Totals
      totalIncome,
      totalExpenses,
      totalOutstanding: outstandingAgg._sum.outstandingDues || 0,
      netBalance: totalIncome - totalExpenses,
      totalCashInHand,
      // Cash breakdown (for reconciliation transparency)
      totalCashCollected,
      totalNonCashCollected,
      totalSocietyExpensesPaidCash: totalSocietyExpenses,
      totalDeposited,
      // This month
      thisMonthIncome: thisMonthIncome._sum.amount || 0,
      thisMonthExpenses: thisMonthExpenses._sum.amount || 0,
      thisMonthNet: (thisMonthIncome._sum.amount || 0) - (thisMonthExpenses._sum.amount || 0),
      // Last month
      lastMonthIncome: lastMonthIncome._sum.amount || 0,
      lastMonthExpenses: lastMonthExpenses._sum.amount || 0,
      // Members
      totalMembers,
      membersWithDues,
      // Settings
      maintenanceAmount: (tenantInfo as any)?.maintenanceAmount || 0,
      quarterlyAmount: (tenantInfo as any)?.quarterlyAmount || null,
      halfYearlyAmount: (tenantInfo as any)?.halfYearlyAmount || null,
      annualAmount: (tenantInfo as any)?.annualAmount || null,
      enableForums: (tenantInfo as any)?.enableForums || false,
      // Charts
      monthlyTrends: monthlyData,
      expenseByCategory: expenseByCategory.map((e: any) => ({ category: e.category, amount: e._sum.amount || 0 })),
      recentPayments: recentPayments.map((p: any) => ({
        id: p.id, amount: p.amount, mode: p.mode, date: p.paymentDate,
        memberName: p.member?.name || "Unknown", flatNo: p.member?.flatNo || "",
      })),
    });
  } catch (error: any) {
    console.error("Summary error:", error.message);
    res.status(500).json({ message: "Error fetching summary", error: error.message });
  }
});

router.get("/financials", authorize(["TENANT_ADMIN"]), async (req: any, res) => {
  const tenantId = req.user.tenantId;
  const { startDate, endDate } = req.query;

  try {
    let dateFilter: any = {};
    const asOfDate = endDate ? new Date(endDate as string) : new Date();

    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    } else if (startDate) {
      dateFilter = { gte: new Date(startDate as string) };
    } else if (endDate) {
      dateFilter = { lte: new Date(endDate as string) };
    }

    // --- 1. Period P&L Data ---
    const paymentWhere: any = { tenantId, status: "PAID" };
    if (Object.keys(dateFilter).length > 0) paymentWhere.paymentDate = dateFilter;

    const expenseWhere: any = { tenantId };
    if (Object.keys(dateFilter).length > 0) expenseWhere.date = dateFilter;

    // Period payments grouped by periodLabel (excluding onboarding fee)
    const periodIncomeCategories = await prisma.payment.groupBy({
      by: ['periodLabel'],
      where: {
        ...paymentWhere,
        periodLabel: { not: "Initial Onboarding Fee" }
      },
      _sum: { amount: true }
    });

    const periodExpenses = await prisma.expense.groupBy({
      by: ['category'],
      where: expenseWhere,
      _sum: { amount: true }
    });

    // Subscriptions created in the period that are unpaid/pending/overdue
    const periodOutstandingWhere: any = {
      tenantId,
      status: { in: ["PENDING", "OVERDUE", "PARTIAL"] }
    };
    if (Object.keys(dateFilter).length > 0) periodOutstandingWhere.startDate = dateFilter;

    const periodOutstandingAgg = await prisma.subscription.aggregate({
      where: periodOutstandingWhere,
      _sum: { maintenanceAmount: true }
    });
    const periodOutstandingDues = periodOutstandingAgg._sum.maintenanceAmount || 0;

    const periodPaidIncome = periodIncomeCategories.reduce((acc: number, curr: any) => acc + (curr._sum?.amount || 0), 0);
    const totalPeriodIncome = periodPaidIncome + periodOutstandingDues;
    const totalPeriodExpenses = periodExpenses.reduce((acc: number, curr: any) => acc + (curr._sum?.amount || 0), 0);
    const periodNetProfit = totalPeriodIncome - totalPeriodExpenses;

    // --- 2. Cumulative Balance Sheet Data (as of asOfDate) ---
    // A. Cumulative Income (payments up to asOfDate excluding onboarding fee)
    const cumulativeIncomeCategories = await prisma.payment.groupBy({
      by: ['periodLabel'],
      where: {
        tenantId,
        status: "PAID",
        paymentDate: { lte: asOfDate },
        periodLabel: { not: "Initial Onboarding Fee" }
      },
      _sum: { amount: true }
    });
    const cumulativePaidIncome = cumulativeIncomeCategories.reduce((acc: number, curr: any) => acc + (curr._sum?.amount || 0), 0);

    // B. Cumulative Corpus Funds (onboarding fees up to asOfDate)
    const cumulativeCorpusAgg = await prisma.payment.aggregate({
      where: {
        tenantId,
        status: "PAID",
        paymentDate: { lte: asOfDate },
        periodLabel: "Initial Onboarding Fee"
      },
      _sum: { amount: true }
    });
    const cumulativeCorpusFunds = cumulativeCorpusAgg._sum.amount || 0;

    // C. Cumulative Expenses up to asOfDate
    const cumulativeExpensesAgg = await prisma.expense.aggregate({
      where: {
        tenantId,
        date: { lte: asOfDate }
      },
      _sum: { amount: true }
    });
    const cumulativeExpenses = cumulativeExpensesAgg._sum.amount || 0;

    // D. Cumulative Dues Receivable (Outstanding Dues) as of asOfDate
    // Formula: currentOutstandingDues - futureSubscriptions + futurePayments
    const currentDuesAgg = await prisma.member.aggregate({
      where: { tenantId },
      _sum: { outstandingDues: true }
    });
    const currentDues = currentDuesAgg._sum.outstandingDues || 0;

    const futureSubscriptionsAgg = await prisma.subscription.aggregate({
      where: {
        tenantId,
        startDate: { gt: asOfDate }
      },
      _sum: { maintenanceAmount: true }
    });
    const futureSubscriptions = futureSubscriptionsAgg._sum.maintenanceAmount || 0;

    const futurePaymentsAgg = await prisma.payment.aggregate({
      where: {
        tenantId,
        status: "PAID",
        periodLabel: { not: "Initial Onboarding Fee" },
        paymentDate: { gt: asOfDate }
      },
      _sum: { amount: true }
    });
    const futurePayments = futurePaymentsAgg._sum.amount || 0;

    const duesReceivable = Math.max(0, currentDues - futureSubscriptions + futurePayments);

    // E. Cumulative Cash in Hand as of asOfDate
    // Formula: currentCash - futureCashPayments + futureCashDeposits
    const currentCashAgg = await prisma.cashBalance.aggregate({
      where: { user: { tenantId } },
      _sum: { balance: true }
    });
    const currentCash = currentCashAgg._sum.balance || 0;

    const futureCashPaymentsAgg = await prisma.payment.aggregate({
      where: {
        tenantId,
        mode: "CASH",
        status: "PAID",
        paymentDate: { gt: asOfDate }
      },
      _sum: { amount: true }
    });
    const futureCashPayments = futureCashPaymentsAgg._sum.amount || 0;

    const futureCashDepositsAgg = await prisma.cashTransaction.aggregate({
      where: {
        tenantId,
        type: "DEPOSIT",
        createdAt: { gt: asOfDate }
      },
      _sum: { amount: true }
    });
    const futureCashDeposits = futureCashDepositsAgg._sum.amount || 0;

    const cashInHand = Math.max(0, currentCash - futureCashPayments + futureCashDeposits);

    // F. Cumulative Bank Balance as of asOfDate
    // Formula: (cumulativePaidIncome + cumulativeCorpusFunds - cumulativeExpenses) - cashInHand
    const bankBalance = (cumulativePaidIncome + cumulativeCorpusFunds - cumulativeExpenses) - cashInHand;

    // G. Cumulative Net Profit / Accumulated Surplus as of asOfDate
    // Formula: (cumulativePaidIncome + duesReceivable) - cumulativeExpenses
    const cumulativeNetProfit = (cumulativePaidIncome + duesReceivable) - cumulativeExpenses;

    res.json({
      profitAndLoss: {
        income: [
          ...periodIncomeCategories.map((i: any) => ({ category: i.periodLabel || 'General', amount: i._sum?.amount || 0 })),
          ...(periodOutstandingDues > 0 ? [{ category: "Outstanding Dues (Receivable)", amount: periodOutstandingDues }] : [])
        ],
        expenses: periodExpenses.map((e: any) => ({ category: e.category, amount: e._sum?.amount || 0 })),
        totalIncome: totalPeriodIncome,
        totalExpenses: totalPeriodExpenses,
        netProfit: periodNetProfit
      },
      balanceSheet: {
        assets: {
          cashInHand,
          bankBalance,
          duesReceivable
        },
        liabilities: {
          corpusFunds: cumulativeCorpusFunds
        },
        netProfit: cumulativeNetProfit
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching financials", error: error.message });
  }
});

export default router;
