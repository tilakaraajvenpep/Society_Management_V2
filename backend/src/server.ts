import app from "./app";
import { ensureTenantSchemas } from "./utils/prisma";
import pg from "pg";

const PORT = process.env.PORT || 5001;

// Ensure critical tables exist in the public schema before anything else
async function ensurePublicTables() {
  const connStr = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  const isLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1");
  const client = new pg.Client({
    connectionString: connStr,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  try {
    await client.connect();

    // MaintenanceCost table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MaintenanceCost" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "tenantId" TEXT NOT NULL,
        "financialYear" TEXT NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "residenceType" TEXT NOT NULL DEFAULT 'COMMON',
        "bhk" TEXT NOT NULL DEFAULT 'COMMON',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MaintenanceCost_pkey" PRIMARY KEY ("id")
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MaintenanceCost_tenantId_financialYear_residenceType_bhk_key"
      ON "MaintenanceCost"("tenantId", "financialYear", "residenceType", "bhk")
    `);

    // Add FK if not exists
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'MaintenanceCost_tenantId_fkey'
        ) THEN
          ALTER TABLE "MaintenanceCost"
          ADD CONSTRAINT "MaintenanceCost_tenantId_fkey"
          FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      EXCEPTION WHEN others THEN NULL;
      END $$
    `);

    // Ensure Member table has bhk / residenceType / useCommonMaintenance / registrationYear columns
    const memberColFixes = [
      { col: "residenceType", def: "TEXT NOT NULL DEFAULT 'COMMON'" },
      { col: "bhk", def: "TEXT NOT NULL DEFAULT 'COMMON'" },
      { col: "useCommonMaintenance", def: "BOOLEAN NOT NULL DEFAULT true" },
      { col: "registrationYear", def: "TEXT" }
    ];
    for (const { col, def } of memberColFixes) {
      await client.query(`
        DO $$ BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'Member' AND column_name = '${col}'
          ) THEN
            ALTER TABLE "Member" ADD COLUMN "${col}" ${def};
          END IF;
        EXCEPTION WHEN others THEN NULL;
        END $$
      `);
    }

    console.log("[Startup] Public schema tables ensured.");
  } catch (err: any) {
    console.error("[Startup] ensurePublicTables error:", err.message);
  } finally {
    await client.end().catch(() => {});
  }
}

async function start() {
  // Step 1: Ensure public schema has all required tables/columns
  await ensurePublicTables().catch(err => {
    console.error("Failed to ensure public tables:", err);
  });

  // Step 2: Sync public schema to all tenant schemas
  await ensureTenantSchemas().catch(err => {
    console.error("Failed to sync tenant schemas:", err);
  });

  // Step 3: Start the server
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

start();
