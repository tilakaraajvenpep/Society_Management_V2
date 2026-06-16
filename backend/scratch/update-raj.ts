import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const dbUrl = `postgresql://postgres:password@localhost:5432/society_sms`;
  const pool = new pg.Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const updated = await prisma.member.updateMany({
      where: { mobile: '9442620825' },
      data: {
        paidUntil: new Date('2026-05-31T00:00:00.000Z')
      }
    });
    console.log("Successfully updated raj's record:", updated);
  } catch (err: any) {
    console.error("Error updating raj:", err.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
