import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  const pgClient = new Client({
    connectionString: masterConnectionString,
  });
  await pgClient.connect();

  try {
    console.log("Fetching schemas...");
    const schemas = await pgClient.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'society_%'`
    );
    console.log("Schemas found:", schemas.rows.map(r => r.schema_name));

    console.log("Fetching Tenants in public.Tenant...");
    const tenants = await pgClient.query(`SELECT id, name, slug FROM "public"."Tenant"`);
    console.log("Tenants found:", tenants.rows);

    for (const tenant of tenants.rows) {
      const tenantSchema = `society_${tenant.slug}`;
      console.log(`Checking users inside schema: ${tenantSchema}`);
      try {
        const users = await pgClient.query(`SELECT id, email, name, role FROM "${tenantSchema}"."User"`);
        console.log(`Users in ${tenantSchema}:`, users.rows);
      } catch (e: any) {
        console.error(`Error reading users from ${tenantSchema}:`, e.message);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await pgClient.end();
  }
}

main();
