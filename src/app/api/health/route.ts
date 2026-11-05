import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { json, route } from "@/server/http";

export const GET = route(async () => {
  const t = Date.now();
  await db.execute(sql`select 1`);
  return json({ ok: true, db: "up", ms: Date.now() - t });
});
