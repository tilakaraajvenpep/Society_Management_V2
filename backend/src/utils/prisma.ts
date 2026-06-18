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
    // Fetch all active/existing tenants from public."Tenant"
    let tenantSlugs: string[] = [];
    try {
      const tenantsRes = await pgClient.query(`
        SELECT slug FROM "public"."Tenant"
      `);
      tenantSlugs = tenantsRes.rows.map(r => r.slug);
    } catch (err: any) {
      console.log("[ensureTenantSchemas] Tenant table query failed, probably empty or not migrated yet:", err.message);
    }

    // Filter out any empty slugs and map to schemaNames
    const schemas = tenantSlugs.filter(Boolean).map(slug => `society_${slug}`);

    // First pass: Ensure all schemas exist and have enums cloned
    for (const schemaName of schemas) {
      await pgClient.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
      
      const publicEnumsRes = await pgClient.query(`
        SELECT t.typname 
        FROM pg_type t 
        JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
        WHERE n.nspname = 'public' AND t.typtype = 'e'
      `);
      const publicEnums = publicEnumsRes.rows.map(r => r.typname);

      for (const enumName of publicEnums) {
        const enumExists = await pgClient.query(`
          SELECT 1 FROM pg_type t 
          JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
          WHERE n.nspname = $1 AND t.typname = $2
        `, [schemaName, enumName]);
        
        if (enumExists.rowCount === 0) {
          const enumValuesRes = await pgClient.query(`
            SELECT enumlabel 
            FROM pg_enum e 
            JOIN pg_type t ON e.enumtypid = t.oid 
            JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace 
            WHERE n.nspname = 'public' AND t.typname = $1
            ORDER BY enumsortorder
          `, [enumName]);
          const valuesStr = enumValuesRes.rows.map(v => `'${v.enumlabel}'`).join(', ');
          console.log(`[ensureTenantSchemas] Creating enum type ${enumName} in schema ${schemaName}...`);
          try {
            await pgClient.query(`CREATE TYPE "${schemaName}"."${enumName}" AS ENUM (${valuesStr})`);
          } catch (enumErr: any) {
            console.log(`[ensureTenantSchemas] Enum type ${enumName} creation skipped:`, enumErr.message);
          }
        }
      }
    }
    
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
      const newlyClonedTables = new Set<string>();
      
      // Pass 1: Create all missing tables first
      for (const tableName of publicTables) {
        if (!existingTables.has(tableName)) {
          console.log(`Table ${tableName} is missing in schema ${schemaName}. Cloning...`);
          await pgClient.query(`CREATE TABLE IF NOT EXISTS "${schemaName}"."${tableName}" (LIKE "public"."${tableName}" INCLUDING ALL)`);
          newlyClonedTables.add(tableName);
        }
      }

      // Pass 2: Remap enums and clone foreign key constraints for newly cloned tables
      for (const tableName of publicTables) {
        if (newlyClonedTables.has(tableName)) {
          // Remap column enum types to target schema's enum types
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
          
          // Clone foreign key constraints
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
        } else {
          // Table exists. Let's make sure it has all columns that public table has.
          const publicColsRes = await pgClient.query(`
            SELECT column_name, data_type, udt_name, udt_schema, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
          `, [tableName]);

          const tenantColsRes = await pgClient.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = $1 AND table_name = $2
          `, [schemaName, tableName]);
          const tenantCols = new Set(tenantColsRes.rows.map(r => r.column_name));

          for (const col of publicColsRes.rows) {
            if (!tenantCols.has(col.column_name)) {
              console.log(`Column ${col.column_name} is missing in table ${tableName} of schema ${schemaName}. Adding...`);
              
              let typeStr = col.data_type;
              if (col.data_type === 'USER-DEFINED') {
                typeStr = `"${schemaName}"."${col.udt_name}"`;
              } else if (col.data_type === 'ARRAY' && col.udt_name.startsWith('_')) {
                const elementUdtName = col.udt_name.substring(1);
                typeStr = `"${schemaName}"."${elementUdtName}"[]`;
              }

              let addQuery = `ALTER TABLE "${schemaName}"."${tableName}" ADD COLUMN "${col.column_name}" ${typeStr}`;
              
              if (col.is_nullable === 'NO') {
                addQuery += ' NOT NULL';
              }
              
              if (col.column_default !== null) {
                const rawDefault = col.column_default.split('::')[0];
                if (col.data_type === 'USER-DEFINED') {
                  addQuery += ` DEFAULT ${rawDefault}::"${schemaName}"."${col.udt_name}"`;
                } else {
                  addQuery += ` DEFAULT ${col.column_default}`;
                }
              }

              await pgClient.query(addQuery);
            }
          }
        }

        // Synchronize indexes for this table
        const publicIndexesRes = await pgClient.query(`
          SELECT indexname, indexdef
          FROM pg_indexes
          WHERE schemaname = 'public' AND tablename = $1
        `, [tableName]);

        const tenantIndexesRes = await pgClient.query(`
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = $1 AND tablename = $2
        `, [schemaName, tableName]);
        const tenantIndexes = new Set(tenantIndexesRes.rows.map(r => r.indexname));

        for (const idx of publicIndexesRes.rows) {
          if (!tenantIndexes.has(idx.indexname)) {
            console.log(`Index ${idx.indexname} is missing in table ${tableName} of schema ${schemaName}. Creating...`);
            let createIdxDef = idx.indexdef;
            createIdxDef = createIdxDef.replace(`public."${tableName}"`, `"${schemaName}"."${tableName}"`);
            createIdxDef = createIdxDef.replace(`public.${tableName}`, `"${schemaName}"."${tableName}"`);
            try {
              await pgClient.query(createIdxDef);
            } catch (idxErr: any) {
              console.error(`Failed to create index ${idx.indexname} in schema ${schemaName}:`, idxErr.message);
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
