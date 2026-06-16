import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const membersList = await prisma.member.findMany({
      include: {
        user: true
      }
    });
    console.log(JSON.stringify(membersList, null, 2));
  } catch (err) {
    console.error("Error in check-data:", err);
  }
}

main().finally(() => prisma.$disconnect());
