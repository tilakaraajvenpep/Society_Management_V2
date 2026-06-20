import { masterPrisma } from "./src/utils/prisma";

async function main() {
  const users = await masterPrisma.user.findMany();
  console.log("All users in master DB:");
  for (const u of users) {
    console.log(`- ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Role: ${u.role}, TenantId: ${u.tenantId}`);
  }
}

main()
  .catch(console.error)
  .finally(() => masterPrisma.$disconnect());
