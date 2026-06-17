import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import prisma from "./utils/prisma";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes will be imported here
import authRoutes from "./routes/auth";
import tenantRoutes from "./routes/tenant";
import memberRoutes from "./routes/member";
import paymentRoutes from "./routes/payment";
import cashRoutes from "./routes/cash";
import expenseRoutes from "./routes/expense";
import vendorRoutes from "./routes/vendor";
import subscriptionRoutes from "./routes/subscription";
import reportRoutes from "./routes/report";
import platformRoutes from "./routes/platform";
import staffRoutes from "./routes/staff";
import masterDataRoutes from "./routes/masterData";
import ticketRoutes from "./routes/ticket";
import uploadRoutes from "./routes/upload";
import maintenanceCostRoutes from "./routes/maintenanceCost";
import notificationRoutes from "./routes/notification";
import eventRoutes from "./routes/event";

app.use("/api/auth", authRoutes);
app.use("/api/tenants", tenantRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/cash", cashRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/master-data", masterDataRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/maintenance-costs", maintenanceCostRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/events", eventRoutes);

app.get("/", (req, res) => {
  res.send("Society Management API is running...");
});

import { getTenantPrisma, masterPrisma } from "./utils/prisma";
app.get("/api/debug-maintenance-costs", async (req, res) => {
  try {
    const tenantSlug = "sms";
    const tenantClient = getTenantPrisma(tenantSlug);
    const tenant = await masterPrisma.tenant.findFirst({ where: { slug: tenantSlug } });
    if (!tenant) {
      return res.status(404).json({ error: "Tenant 'sms' not found" });
    }
    const costs = await tenantClient.maintenanceCost.findMany({
      where: { tenantId: tenant.id },
      orderBy: { financialYear: "asc" }
    });
    res.json(costs);
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

import pg from "pg";
app.get("/api/inspect-db", async (req, res) => {
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  const isLocalhost = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
  const client = new pg.Client({
    connectionString,
    ssl: isLocalhost ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
      FROM 
          pg_indexes
      WHERE 
          tablename = 'MaintenanceCost' OR tablename = 'Member'
      ORDER BY 
          schemaname, tablename, indexname
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  } finally {
    await client.end();
  }
});

// ─── Monthly Dues Notification Scheduler ─────────────────────────────────────
// Runs on the 1st of every month and sends dues reminders to all members
// across all tenants who have outstanding dues and a linked portal account.
async function sendMonthlyDuesReminders() {
  try {
    const now = new Date();
    const monthName = now.toLocaleString("default", { month: "long" });
    const year = now.getFullYear();

    console.log(`[Scheduler] Running monthly dues reminders for ${monthName} ${year}...`);

    // Get all tenants
    const tenants = await prisma.tenant.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    });

    let totalSent = 0;

    for (const tenant of tenants) {
      const membersWithDues = await prisma.member.findMany({
        where: {
          tenantId: tenant.id,
          status: "ACTIVE",
          outstandingDues: { gt: 0 },
          userId: { not: null },
        },
        select: {
          id: true,
          name: true,
          flatNo: true,
          outstandingDues: true,
          userId: true,
        },
      });

      if (membersWithDues.length === 0) continue;

      const notificationsData = membersWithDues.map((m) => ({
        tenantId: tenant.id,
        userId: m.userId!,
        title: `Monthly Dues Reminder — ${monthName} ${year}`,
        message: `Dear ${m.name}, your maintenance dues of ₹${m.outstandingDues.toLocaleString("en-IN")} for Flat ${m.flatNo} are pending. Please pay at the earliest to avoid inconvenience. Contact the society office if you have any questions.`,
        type: "DUES_REMINDER",
      }));

      await prisma.notification.createMany({ data: notificationsData });

      // Log the automated action
      await prisma.auditLog.create({
        data: {
          tenantId: tenant.id,
          actionType: "AUTO_DUES_REMINDER_SENT",
          performedBy: "System Scheduler",
          details: `Automated monthly dues reminder sent to ${membersWithDues.length} member(s) in ${tenant.name} for ${monthName} ${year}.`,
        },
      });

      totalSent += membersWithDues.length;
      console.log(`[Scheduler] Sent ${membersWithDues.length} reminders for tenant: ${tenant.name}`);
    }

    console.log(`[Scheduler] Monthly dues reminders complete. Total sent: ${totalSent}`);
  } catch (err) {
    console.error("[Scheduler] Error sending monthly dues reminders:", err);
  }
}

// Schedule to run on the 1st of every month at 9:00 AM
function scheduleMonthlyDuesReminder() {
  const checkAndRun = () => {
    const now = new Date();
    // Run on the 1st day of the month
    if (now.getDate() === 1) {
      sendMonthlyDuesReminders();
    }
  };

  // Check every 6 hours to be safe (won't run twice on same day because we track date)
  let lastRunMonth = -1;
  setInterval(() => {
    const now = new Date();
    if (now.getDate() === 1 && now.getMonth() !== lastRunMonth) {
      lastRunMonth = now.getMonth();
      sendMonthlyDuesReminders();
    }
  }, 6 * 60 * 60 * 1000); // every 6 hours

  console.log("[Scheduler] Monthly dues reminder scheduler initialized.");
}

// Start the scheduler when app is loaded
scheduleMonthlyDuesReminder();
// ─────────────────────────────────────────────────────────────────────────────

export default app; // Trigger dev server reload
