import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const members = await prisma.member.findMany();
  console.log("All Members:", members.map(m => ({
    id: m.id,
    name: m.name,
    flatNo: m.flatNo,
    mobile: m.mobile,
    paidUntil: m.paidUntil
  })));
}

main().finally(() => pool.end());
