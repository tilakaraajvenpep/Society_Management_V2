import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@example.com" },
    update: {},
    create: {
      email: "superadmin@example.com",
      password: hashedPassword,
      name: "Platform Admin",
      role: "SUPER_ADMIN",
    },
  });

  console.log("Super Admin created:", superAdmin.email);

  // Create Sample Tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Sunrise Apartments",
      address: "123 Sunshine Street",
      billingCycle: "MONTHLY",
      maintenanceAmount: 2500,
    },
  });

  console.log("Sample Tenant created:", tenant.name);

  // Create Tenant Admin
  const tenantAdmin = await prisma.user.create({
    data: {
      email: "treasurer@sunrise.com",
      password: hashedPassword,
      name: "John Doe",
      role: "TENANT_ADMIN",
      tenantId: tenant.id,
    },
  });

  console.log("Tenant Admin created:", tenantAdmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
