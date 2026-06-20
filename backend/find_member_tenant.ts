import { masterPrisma, getTenantPrisma } from "./src/utils/prisma";

async function main() {
  const tenants = await masterPrisma.tenant.findMany();
  console.log(`Found ${tenants.length} tenants in master DB.`);

  for (const tenant of tenants) {
    console.log(`\nTenant: ${tenant.name} (Slug: ${tenant.slug})`);
    const tenantPrisma = getTenantPrisma(tenant.slug);
    try {
      const members = await tenantPrisma.member.findMany({
        include: { user: true }
      });
      console.log(`Members in ${tenant.slug}:`);
      for (const m of members) {
        console.log(`- Name: ${m.name}, Flat: ${m.flatNo}, Mobile: ${m.mobile}`);
        if (m.user) {
          console.log(`  User Email: ${m.user.email}`);
        }
      }
    } catch (err: any) {
      console.error(`Error querying tenant ${tenant.slug}:`, err.message);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => masterPrisma.$disconnect());
