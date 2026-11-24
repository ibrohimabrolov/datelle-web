import "server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "../db";
import { audit, type StudioCtx } from "./auth";

/* "Tez orada" fake door (Figma Sidebar · Tez orada, 07 · Tez orada): a studio member taps
   "Menga kerak" on a feature that is not built yet. Each vote is one studio_events row
   (entity "interest", entity_id = feature) — no new table; demand is read with
   select entity_id, count(distinct studio_id) from studio_events where entity = 'interest' group by 1; */
export const FEATURES = ["rekvizit", "jamoa-jadvali", "xarajatlar", "logo"] as const; // logo = Sozlamalar → Logo «Yuklash»
export type Feature = (typeof FEATURES)[number];
export const interestBody = z.object({ feature: z.enum(FEATURES) });

export async function myInterests(ctx: StudioCtx): Promise<Feature[]> {
  const rows = await db
    .selectDistinct({ feature: schema.studioEvents.entityId })
    .from(schema.studioEvents)
    .where(
      and(
        eq(schema.studioEvents.studioId, ctx.studio.id),
        eq(schema.studioEvents.actorId, ctx.user.id),
        eq(schema.studioEvents.entity, "interest"),
      ),
    );
  return rows.map((r) => r.feature).filter((f): f is Feature => (FEATURES as readonly string[]).includes(f));
}

/* Idempotent: a second tap by the same person in the same studio records nothing new */
export async function voteInterest(ctx: StudioCtx, feature: Feature): Promise<Feature[]> {
  const mine = await myInterests(ctx);
  if (!mine.includes(feature)) {
    await audit(db, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "interest", entityId: feature, action: "vote", diff: { role: ctx.role } });
    mine.push(feature);
  }
  return mine;
}
