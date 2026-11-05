import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError } from "./http";

/* Fixed window counter in Postgres. Returns remaining; throws 429 when exceeded. */
export async function limit(key: string, max: number, windowSec: number, message = "Juda koʻp urinish. Birozdan keyin qayta urinib koʻring.") {
  const windowStart = new Date(Math.floor(Date.now() / (windowSec * 1000)) * windowSec * 1000);
  const [row] = await db
    .insert(schema.rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [schema.rateLimits.key, schema.rateLimits.windowStart],
      set: { count: sql`${schema.rateLimits.count} + 1` },
    })
    .returning({ count: schema.rateLimits.count });
  if (row.count > max) {
    const retryAfter = Math.ceil((windowStart.getTime() + windowSec * 1000 - Date.now()) / 1000);
    throw new HttpError(429, "rate_limited", message, { retryAfter });
  }
  return max - row.count;
}
