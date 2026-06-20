import prisma, { getTenantPrisma } from "./src/utils/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const tenantId = "f44de536-640e-48e5-af1a-1ef0bd4af61c"; // Sunrise Apartments ID
  const passwordHash = await bcrypt.hash("password123", 10);

  // Clear existing
  const tenantPrisma = getTenantPrisma("sunrise");
  
  await tenantPrisma.member.deleteMany({ where: { email: "member@example.com" } }).catch(() => {});
  await tenantPrisma.user.deleteMany({ where: { email: "member@example.com" } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: "member@example.com" } }).catch(() => {});

  // 1. Create public User
  const user = await prisma.user.create({
    data: {
      name: "Test Member (Primary)",
      email: "member@example.com",
      mobile: "9999999999",
      password: passwordHash,
      role: "MEMBER",
      tenantId: tenantId
    }
  });
  console.log("Created user in public schema:", user.id);

  // Set date for late fee and discount on Tenant to test them
  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      discountDate: new Date("2026-06-25T23:59:59Z"),
      discountAmount: 150,
      lateFeeDate: new Date("2026-06-15T23:59:59Z"),
      lateFeeAmount: 200,
      maintenanceAmount: 2500
    }
  });
  console.log("Updated tenant in public schema.");

  // Create tenant in tenant schema
  await tenantPrisma.tenant.upsert({
    where: { id: tenantId },
    update: {
      name: "Sunrise Apartments",
      address: "123 Sunshine Street",
      billingCycle: "MONTHLY",
      maintenanceAmount: 2500,
      slug: "sunrise",
      discountDate: new Date("2026-06-25T23:59:59Z"),
      discountAmount: 150,
      lateFeeDate: new Date("2026-06-15T23:59:59Z"),
      lateFeeAmount: 200,
    },
    create: {
      id: tenantId,
      name: "Sunrise Apartments",
      address: "123 Sunshine Street",
      billingCycle: "MONTHLY",
      maintenanceAmount: 2500,
      slug: "sunrise",
      discountDate: new Date("2026-06-25T23:59:59Z"),
      discountAmount: 150,
      lateFeeDate: new Date("2026-06-15T23:59:59Z"),
      lateFeeAmount: 200,
    }
  });
  console.log("Created/Updated tenant in society_sunrise schema.");

  // Sync the member user to the tenant schema User table FIRST
  await tenantPrisma.user.create({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      password: user.password,
      role: "MEMBER",
      tenantId: tenantId
    }
  });
  console.log("Synced user to society_sunrise schema.");

  // Now create member
  const member = await tenantPrisma.member.create({
    data: {
      name: "Test Member",
      email: "member@example.com",
      mobile: "9999999999",
      flatNo: "411",
      outstandingDues: 5000,
      tenantId: tenantId,
      userId: user.id,
      registrationYear: "2026-27",
      useCommonMaintenance: true
    }
  });
  console.log("Created member in society_sunrise schema:", member.id);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
