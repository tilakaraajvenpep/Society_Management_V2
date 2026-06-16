const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // Create Super Admin Only
  const existingAdmin = await prisma.user.findFirst({
    where: { email: "superadmin@example.com", role: "SUPER_ADMIN" }
  });

  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: "superadmin@example.com",
        password: hashedPassword,
        name: "Platform Admin",
        role: "SUPER_ADMIN",
        tenantId: null,
      },
    });
    console.log("Super Admin created: superadmin@example.com");
  } else {
    console.log("Super Admin already exists: superadmin@example.com");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
