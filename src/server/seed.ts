/* Seed: vendor profiles from src/data/catalog.ts + synthetic availability.
   Idempotent — run any time: `npm run db:seed`. Never touches users or requests. */
import { createHash } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./db/schema";
import { VENDORS } from "../data/catalog";
import { addDays, isWeekend, todayISO } from "../lib/dates";

const PAST = 30;
const AHEAD = 240;

const h = (s: string) => createHash("md5").update(s).digest().readUInt32BE(0);

/* Weekends book out; weekdays mostly open — roughly Toshkent wedding-season density */
function bookedFor(slug: string, day: string, cap: number) {
  const r = h(`${slug}:${day}`) % 100;
  if (isWeekend(day)) return r < 72 ? cap : r < 84 ? cap - 1 : r < 92 ? 1 : 0;
  return r < 22 ? cap : r < 30 ? cap - 1 : r < 45 ? 1 : 0;
}

export async function seed(url = process.env.DATABASE_URL!) {
  const pool = new Pool({ connectionString: url, max: 2 });
  const db = drizzle(pool, { schema, casing: "snake_case" });
  const today = todayISO();

  await db.transaction(async (tx) => {
    for (const vnd of VENDORS) {
      const [row] = await tx
        .insert(schema.vendors)
        .values({
          slug: vnd.slug, name: vnd.name, category: vnd.category, district: vnd.district, rating: vnd.rating,
          reviewsCount: vnd.reviews, priceFrom: vnd.priceFrom, responseHours: vnd.responseHours, verified: vnd.verified,
          completedCount: vnd.completed, events: vnd.events, rank: vnd.rank, imageKey: vnd.imageKey, about: vnd.about,
        })
        .onConflictDoUpdate({
          target: schema.vendors.slug,
          set: {
            name: sql`excluded.name`, district: sql`excluded.district`, rating: sql`excluded.rating`, reviewsCount: sql`excluded.reviews_count`,
            priceFrom: sql`excluded.price_from`, responseHours: sql`excluded.response_hours`, events: sql`excluded.events`,
            rank: sql`excluded.rank`, imageKey: sql`excluded.image_key`, about: sql`excluded.about`,
          },
        })
        .returning({ id: schema.vendors.id, cap: schema.vendors.dailyCapacity });

      for (const [i, p] of vnd.packages.entries()) {
        await tx
          .insert(schema.packages)
          .values({ id: p.id, vendorId: row.id, title: p.title, includes: p.includes, price: p.price, sort: i })
          .onConflictDoUpdate({ target: schema.packages.id, set: { title: p.title, includes: p.includes, price: p.price, sort: i } });
      }

      const days = [];
      for (let i = -PAST; i <= AHEAD; i++) {
        const day = addDays(today, i);
        const booked = bookedFor(vnd.slug, day, row.cap);
        if (booked > 0) days.push({ vendorId: row.id, day, booked });
      }
      // only fill days that have no real bookings yet
      if (days.length) await tx.insert(schema.vendorDays).values(days).onConflictDoNothing();
    }
  });

  const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int n from vendors`)).rows;
  await pool.end();
  return n;
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seed().then((n) => console.log(`seeded ${n} vendors`)).catch((e) => (console.error(e), process.exit(1)));
}
