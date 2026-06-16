import { masterPrisma } from "../src/utils/prisma";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const tenants = await masterPrisma.tenant.findMany();
  for (const tenant of tenants) {
    console.log(`--- Tenant: ${tenant.slug} (${tenant.name}) ---`);
    const dbUrl = `postgresql://postgres:password@localhost:5432/society_${tenant.slug}`;
    const pool = new pg.Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);
    const tenantPrisma = new PrismaClient({ adapter });

    try {
      const members = await tenantPrisma.member.findMany();
      console.log("Members:", members.map((m: any) => ({
        id: m.id,
        name: m.name,
        flatNo: m.flatNo,
        mobile: m.mobile,
        paidUntil: m.paidUntil
      })));
    } catch (err: any) {
      console.error(`Error querying tenant ${tenant.slug}:`, err.message);
    } finally {
      await tenantPrisma.$disconnect();
      await pool.end();
    }
  }
}

main().catch(console.error).finally(() => masterPrisma.$disconnect());
