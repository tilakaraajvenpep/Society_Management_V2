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
    const tenants = await prisma.tenant.count();
    const members = await prisma.member.count();
    const users = await prisma.user.count();
    const tickets = await prisma.ticket.count();
    console.log({ tenants, members, users, tickets });
  } catch (err) {
    console.error("Error in check-data:", err);
  }
}

main().finally(() => prisma.$disconnect());
