import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;

/* One pool per process; survives dev hot reloads */
const g = globalThis as unknown as { __pg?: Pool };
const pool =
  g.__pg ??
  new Pool({
    connectionString: url,
    max: Number(process.env.DB_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
  });
if (process.env.NODE_ENV !== "production") g.__pg = pool;

export const db = drizzle(pool, { schema, casing: "snake_case" });
export const hasDatabase = Boolean(url);
export { schema };
