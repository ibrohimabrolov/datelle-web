/* Runs before `next build` on Vercel (package.json → vercel-build).
   1. Applies pending migrations from ./drizzle
   2. Seeds vendors + availability only when the database is empty — never overwrites admin edits
   Without DATABASE_URL it does nothing, so the site still builds. */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { seed } from "../src/server/seed";

async function main() {
  // Neon gives a pooled URL (runtime) and a direct one (migrations); prefer direct
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.warn("[predeploy] DATABASE_URL yoʻq — migratsiya va seed oʻtkazib yuborildi");
    return;
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("[predeploy] migratsiyalar qoʻllandi");
    const { rows } = await db.execute<{ n: number }>(sql`select count(*)::int as n from vendors`);
    if (rows[0].n === 0) {
      const n = await seed(url);
      console.log(`[predeploy] boʻsh baza — ${n} ta studiya qoʻshildi`);
    } else {
      console.log(`[predeploy] bazada ${rows[0].n} ta studiya bor — seed oʻtkazib yuborildi`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("[predeploy] xato:", e);
  process.exit(1);
});
