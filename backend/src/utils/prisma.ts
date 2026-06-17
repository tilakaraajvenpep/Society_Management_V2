import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { AsyncLocalStorage } from "async_hooks";
import dotenv from "dotenv";

dotenv.config();

const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
const isLocalhost = masterConnectionString.includes("localhost") || masterConnectionString.includes("127.0.0.1");
const masterPool = new pg.Pool({ 
  connectionString: masterConnectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});
const masterAdapter = new PrismaPg(masterPool);

export const masterPrisma = new PrismaClient({ adapter: masterAdapter });

const tenantClients: { [slug: string]: PrismaClient } = {};

export const tenantStorage = new AsyncLocalStorage<{ tenantSlug: string }>();

export const getTenantDbUrl = (tenantSlug: string): string => {
  const masterUrl = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  try {
    const parsed = new URL(masterUrl);
    parsed.searchParams.set("options", `-c search_path=society_${tenantSlug}`);
    return parsed.toString();
  } catch (e) {
    return `${masterUrl}?options=-c%20search_path%3Dsociety_${tenantSlug}`;
  }
};

export const getTenantPrisma = (tenantSlug: string): PrismaClient => {
  if (!tenantClients[tenantSlug]) {
    const dbUrl = getTenantDbUrl(tenantSlug);
    const isTenantLocalhost = dbUrl.includes("localhost") || dbUrl.includes("127.0.0.1");
    const tenantPool = new pg.Pool({ 
      connectionString: dbUrl,
      ssl: isTenantLocalhost ? false : { rejectUnauthorized: false }
    });
    const tenantAdapter = new PrismaPg(tenantPool, { schema: `society_${tenantSlug}` });
    tenantClients[tenantSlug] = new PrismaClient({ adapter: tenantAdapter });
  }
  return tenantClients[tenantSlug];
};

const prismaProxy = new Proxy(masterPrisma, {
  get(target, prop, receiver) {
    const store = tenantStorage.getStore();
    if (store && store.tenantSlug) {
      const tenantClient = getTenantPrisma(store.tenantSlug);
      return Reflect.get(tenantClient, prop);
    }
    return Reflect.get(target, prop);
  },
});

export async function ensureTenantSchemas() {
  const masterConnectionString = process.env.DATABASE_URL || "postgresql://postgres:password@localhost:5432/society_management";
  const isClientLocalhost = masterConnectionString.includes("localhost") || masterConnectionString.includes("127.0.0.1");
  const pgClient = new pg.Client({
    connectionString: masterConnectionString,
    ssl: isClientLocalhost ? false : { rejectUnauthorized: false }
  });
  try {
    await pgClient.connect();
    
    // Get all schemas matching 'society_%'
    const schemasRes = await pgClient.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name LIKE 'society_%'
    `);
    
    const schemas = schemasRes.rows.map(r => r.schema_name);
    
    // Get all tables in public schema
    const tablesRes = await pgClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE' 
        AND table_name != '_prisma_migrations'
    `);
    const publicTables = tablesRes.rows.map(r => r.table_name);
    
    for (const schemaName of schemas) {
      // For this schema, get existing tables
      const existingTablesRes = await pgClient.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = $1
      `, [schemaName]);
      const existingTables = new Set(existingTablesRes.rows.map(r => r.table_name));
      
      for (const tableName of publicTables) {
        if (!existingTables.has(tableName)) {
          console.log(`Table ${tableName} is missing in schema ${schemaName}. Cloning...`);
          // 1. Create table
          await pgClient.query(`CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (LIKE "public"."${tableName}" INCLUDING ALL)`);
          
          // 2. Remap column enum types to target schema's enum types
          const colsRes = await pgClient.query(`
            SELECT 
                column_name, 
                udt_name,
                column_default
            FROM 
                information_schema.columns 
            WHERE 
                table_schema = $1
                AND table_name = $2
                AND udt_schema = 'public'
          `, [schemaName, tableName]);
          
          for (const col of colsRes.rows) {
            const hasDefault = col.column_default !== null;
            if (hasDefault) {
              await pgClient.query(`ALTER TABLE "${schemaName}"."${tableName}" ALTER COLUMN "${col.column_name}" DROP DEFAULT`);
            }
            
            const remapQuery = `
              ALTER TABLE "${schemaName}"."${tableName}" 
              ALTER COLUMN "${col.column_name}" 
              TYPE "${schemaName}"."${col.udt_name}" 
              USING "${col.column_name}"::text::"${schemaName}"."${col.udt_name}"
            `;
            await pgClient.query(remapQuery);
            
            if (hasDefault) {
              const rawDefault = col.column_default.split('::')[0];
              await pgClient.query(`ALTER TABLE "${schemaName}"."${tableName}" ALTER COLUMN "${col.column_name}" SET DEFAULT ${rawDefault}::"${schemaName}"."${col.udt_name}"`);
            }
          }
          
          // 3. Clone foreign key constraints for this table from public schema
          const fkQuery = `
            SELECT 
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
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND tc.table_schema = 'public'
              AND tc.table_name = $1;
          `;
          const fkRes = await pgClient.query(fkQuery, [tableName]);
          for (const fk of fkRes.rows) {
            const alterQuery = `
              ALTER TABLE "${schemaName}"."${tableName}"
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
        }
      }
    }
  } catch (error) {
    console.error("Error ensuring tenant schemas are up to date:", error);
  } finally {
    await pgClient.end();
  }
}

export default prismaProxy;
