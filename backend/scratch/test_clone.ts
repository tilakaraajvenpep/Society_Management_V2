import { Client } from "pg";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

dotenv.config();

async function main() {
  const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  const tenantSlug = "test_clone_slug";
  const schemaName = `society_${tenantSlug}`;
  
  const pgClient = new Client({
    connectionString: masterConnectionString,
  });
  await pgClient.connect();

  try {
    console.log(`Dropping old schema if exists...`);
    await pgClient.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);

    // Clean up master database record if left from previous runs
    console.log("Cleaning up Tenant record in public schema...");
    await pgClient.query(`DELETE FROM "public"."Tenant" WHERE id = 'test-tenant-id'`);

    console.log(`Creating schema: ${schemaName}`);
    await pgClient.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // 1. Clone Enum Types
    console.log(`Cloning enum types from public to ${schemaName}...`);
    const enumQuery = `
      SELECT 
          t.typname AS enum_name,  
          e.enumlabel AS enum_value
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace  
      WHERE n.nspname = 'public'
      ORDER BY enum_name, e.enumsortorder;
    `;
    const enumRes = await pgClient.query(enumQuery);
    
    const enums: { [name: string]: string[] } = {};
    for (const row of enumRes.rows) {
      if (!enums[row.enum_name]) {
        enums[row.enum_name] = [];
      }
      enums[row.enum_name].push(row.enum_value);
    }

    for (const [enumName, values] of Object.entries(enums)) {
      const valuesStr = values.map(v => `'${v}'`).join(', ');
      console.log(`Creating enum: ${enumName} (${valuesStr})`);
      await pgClient.query(`CREATE TYPE "${schemaName}"."${enumName}" AS ENUM (${valuesStr})`);
    }

    // 2. Clone tables
    console.log(`Cloning tables...`);
    const tablesRes = await pgClient.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != '_prisma_migrations'`
    );
    for (const row of tablesRes.rows) {
      const tableName = row.table_name;
      await pgClient.query(`CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (LIKE "public"."${tableName}" INCLUDING ALL)`);
    }

    // 3. Remap column enum types to target schema's enum types
    console.log(`Remapping column enum types to target schema: ${schemaName}...`);
    const colsRes = await pgClient.query(`
      SELECT 
          table_name, 
          column_name, 
          udt_name,
          column_default
      FROM 
          information_schema.columns 
      WHERE 
          table_schema = '${schemaName}' 
          AND udt_schema = 'public'
    `);
    for (const col of colsRes.rows) {
      console.log(`Remapping: ${col.table_name}.${col.column_name} (default: ${col.column_default})`);
      const hasDefault = col.column_default !== null;
      if (hasDefault) {
        await pgClient.query(`ALTER TABLE "${schemaName}"."${col.table_name}" ALTER COLUMN "${col.column_name}" DROP DEFAULT`);
      }
      
      const remapQuery = `
        ALTER TABLE "${schemaName}"."${col.table_name}" 
        ALTER COLUMN "${col.column_name}" 
        TYPE "${schemaName}"."${col.udt_name}" 
        USING "${col.column_name}"::text::"${schemaName}"."${col.udt_name}"
      `;
      await pgClient.query(remapQuery);
      
      if (hasDefault) {
        const rawDefault = col.column_default.split('::')[0];
        await pgClient.query(`ALTER TABLE "${schemaName}"."${col.table_name}" ALTER COLUMN "${col.column_name}" SET DEFAULT ${rawDefault}::"${schemaName}"."${col.udt_name}"`);
      }
    }

    // 4. Clone foreign keys
    console.log(`Cloning foreign keys...`);
    const fkQuery = `
      SELECT 
          tc.table_name, 
          tc.constraint_name, 
          kcu.column_name, 
          ccu.table_name AS foreign_table_name, 
          ccu.column_name AS foreign_column_name,
          rc.update_rule,
          rc.delete_rule
      FROM 
          information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.referential_constraints AS rc
            ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON rc.unique_constraint_name = ccu.constraint_name
            AND rc.unique_constraint_schema = ccu.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';
    `;
    const fkRes = await pgClient.query(fkQuery);
    for (const fk of fkRes.rows) {
      const alterQuery = `
        ALTER TABLE "${schemaName}"."${fk.table_name}"
        ADD CONSTRAINT "${fk.constraint_name}"
        FOREIGN KEY ("${fk.column_name}")
        REFERENCES "${schemaName}"."${fk.foreign_table_name}" ("${fk.foreign_column_name}")
        ON UPDATE ${fk.update_rule}
        ON DELETE ${fk.delete_rule}
      `;
      try {
        await pgClient.query(alterQuery);
      } catch (err: any) {
        if (!err.message.includes("already exists")) {
          throw err;
        }
      }
    }
    await pgClient.end();

    // Test with Prisma Client passing the schema name to PrismaPg options
    console.log(`Connecting to Prisma Client for tenant: ${tenantSlug}`);
    const isTenantLocalhost = masterConnectionString.includes("localhost") || masterConnectionString.includes("127.0.0.1");
    const tenantPool = new pg.Pool({ 
      connectionString: masterConnectionString,
      ssl: isTenantLocalhost ? false : { rejectUnauthorized: false }
    });
    const tenantAdapter = new PrismaPg(tenantPool, { schema: schemaName });
    const tenantPrisma = new PrismaClient({ adapter: tenantAdapter });
    
    // Attempt to insert a Tenant record
    console.log("Inserting tenant record into schema...");
    const tenantRecord = await tenantPrisma.tenant.create({
      data: {
        id: "test-tenant-id",
        name: "Test Tenant",
        address: "Test Address",
        slug: tenantSlug,
        billingCycle: "MONTHLY",
        maintenanceAmount: 100,
        enableForums: false,
      }
    });
    console.log("SUCCESS! Created tenant record via Prisma:", tenantRecord);

    // Verify it is in the schema but NOT in the public schema
    const pgVerify = new Client({
      connectionString: masterConnectionString,
    });
    await pgVerify.connect();
    
    const countPublic = await pgVerify.query(`SELECT count(*) FROM "public"."Tenant" WHERE id = 'test-tenant-id'`);
    const countSchema = await pgVerify.query(`SELECT count(*) FROM "${schemaName}"."Tenant" WHERE id = 'test-tenant-id'`);
    
    console.log(`Count in public.Tenant:`, countPublic.rows[0].count);
    console.log(`Count in ${schemaName}.Tenant:`, countSchema.rows[0].count);
    
    await tenantPrisma.$disconnect();
    await pgVerify.end();
    
    if (countPublic.rows[0].count === '0' && countSchema.rows[0].count === '1') {
      console.log("PERFECT! Prisma successfully wrote only to the schema!");
    } else {
      console.log("WARNING: Verification failed.");
    }
  } catch (error) {
    console.error("FAILED with error:", error);
  }
}

main();
