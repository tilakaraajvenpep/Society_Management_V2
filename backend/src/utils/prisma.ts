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
    parsed.pathname = `/society_${tenantSlug}`;
    return parsed.toString();
  } catch (e) {
    return `postgresql://postgres:password@localhost:5432/society_${tenantSlug}`;
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
    const tenantAdapter = new PrismaPg(tenantPool);
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

export default prismaProxy;
