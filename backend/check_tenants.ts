import { masterPrisma } from "./src/utils/prisma";
import pg from "pg";

async function main() {
  const connStr = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  const isLocal = connStr.includes("localhost") || connStr.includes("127.0.0.1");
  const client = new pg.Client({
    connectionString: connStr,
    ssl: isLocal ? false : { rejectUnauthorized: false }
  });
  await client.connect();

  const schemasRes = await client.query(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'society_%' OR schema_name = 'public'
  `);
  console.log("Schemas:");
  console.log(schemasRes.rows);

  const tenants = await masterPrisma.tenant.findMany();
  console.log("Tenants in public.Tenant:");
  console.log(tenants);

  for (const t of tenants) {
    console.log(`\nTables in schema society_${t.slug}:`);
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = $1
    `, [`society_${t.slug}`]);
    console.log(tables.rows.map(r => r.table_name));

    try {
      const members = await client.query(`SELECT id, name, "flatNo", email, mobile FROM "society_${t.slug}"."Member"`);
      console.log(`Members in society_${t.slug}:`, members.rows);
    } catch (e: any) {
      console.log(`Failed to query members in society_${t.slug}:`, e.message);
    }
  }

  await client.end();
}

main()
  .catch(console.error)
  .finally(() => masterPrisma.$disconnect());
