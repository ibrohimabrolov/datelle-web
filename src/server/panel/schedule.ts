import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { addDays, isISODate, todayISO } from "@/lib/dates";
import { KIND_SLUGS, weekDays, weekStart } from "@/lib/studio/team";
import { db, schema } from "../db";
import { HttpError } from "../http";
import { phoneSchema } from "../phone";
import { audit, type StudioCtx } from "./auth";

/* Jamoa jadvali (Figma 09 · Jamoa jadvali) — owner and manager.
   staff = the crew roster (no sign-in needed); tasks = jobs on a day, linked to an order or not, with 0…n people. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Vaqt notoʻgʻri");
const opt = (max: number) => z.string().trim().max(max, `Koʻpi bilan ${max} ta belgi`).optional().nullable().transform((v) => v || null);

export const staffSchema = z.object({
  name: z.string().trim().min(2, "Ismni kiriting").max(80, "Koʻpi bilan 80 ta belgi"),
  role: z.string().trim().min(2, "Rolini kiriting").max(40, "Koʻpi bilan 40 ta belgi"),
  phone: z.union([phoneSchema, z.literal("").transform(() => null)]).optional().nullable(),
  telegram: z.string().trim().max(33).regex(/^@?[A-Za-z0-9_]{0,32}$/, "Username notoʻgʻri").optional().nullable().transform((v) => v?.replace(/^@/, "") || null),
});
export const staffPatch = staffSchema.partial();
const taskFields = {
  orderId: z.string().regex(UUID_RE, "Buyurtma topilmadi").nullable().optional(),
  kind: z.enum(KIND_SLUGS, { error: "Vazifani tanlang" }),
  day: z.string().refine(isISODate, "Sana notoʻgʻri"),
  startsAt: TIME,
  endsAt: TIME.nullable().optional(),
  place: opt(120),
  note: opt(500),
  staffIds: z.array(z.string().regex(UUID_RE)).max(50).default([]),
};
export const taskSchema = z.object(taskFields);
export const taskPatch = z.object(taskFields).partial();
export const weekQuery = z.object({ week: z.string().refine(isISODate).optional() });

const staffNotFound = () => new HttpError(404, "not_found", "Xodim topilmadi");
const taskNotFound = () => new HttpError(404, "not_found", "Vazifa topilmadi");

/* ── week ── */
export async function scheduleWeek(ctx: StudioCtx, input: z.infer<typeof weekQuery>) {
  const studioId = ctx.studio.id;
  const today = todayISO();
  const monday = weekStart(input.week ?? today);
  const sunday = addDays(monday, 6);
  const [crew, orders, tasks, any] = await Promise.all([
    db
      .select({ id: schema.staff.id, name: schema.staff.name, role: schema.staff.role, phone: schema.staff.phone, telegram: schema.staff.telegram })
      .from(schema.staff)
      .where(and(eq(schema.staff.studioId, studioId), isNull(schema.staff.deletedAt)))
      .orderBy(schema.staff.createdAt),
    db.execute<{ id: string; client: string; venue: string | null; event_type: string; event_date: string }>(sql`
      select o.id, o.client_name as client, o.venue, o.event_type, o.event_date::text from orders o
      where o.studio_id = ${studioId} and o.status <> 'cancelled' and o.event_date between ${monday} and ${sunday}
      order by o.event_date, o.created_at`),
    // one day either side so overnight jobs and clashes across the week edge are visible
    db.execute<{ id: string; order_id: string | null; kind: string; day: string; starts_at: string; ends_at: string | null; place: string | null; note: string | null; event_type: string | null; client: string | null; staff_ids: string[] | null }>(sql`
      select t.id, t.order_id, t.kind, t.day::text, t.starts_at, t.ends_at, t.place, t.note, o.event_type, o.client_name as client,
             array_remove(array_agg(ts.staff_id order by ts.created_at), null) as staff_ids
      from tasks t
      left join orders o on o.id = t.order_id
      left join task_staff ts on ts.task_id = t.id
      where t.studio_id = ${studioId} and t.deleted_at is null and t.day between ${addDays(monday, -1)} and ${addDays(sunday, 1)}
      group by t.id, o.event_type, o.client_name
      order by t.day, t.starts_at`),
    db.execute<{ any: boolean }>(sql`select exists(select 1 from tasks where studio_id = ${studioId} and deleted_at is null) as any`),
  ]);
  return {
    today,
    week: monday,
    days: weekDays(monday),
    staff: crew,
    orders: orders.rows.map((o) => ({ id: o.id, client: o.client, venue: o.venue, eventType: o.event_type, date: o.event_date })),
    tasks: tasks.rows.map((t) => ({
      id: t.id, orderId: t.order_id, kind: t.kind, day: t.day, startsAt: t.starts_at, endsAt: t.ends_at, place: t.place, note: t.note,
      eventType: t.event_type, client: t.client, staffIds: t.staff_ids ?? [],
    })),
    hasAny: crew.length > 0 || Boolean(any.rows[0]?.any),
  };
}

/* ── staff ── */
async function getStaff(ctx: StudioCtx, id: string) {
  if (!UUID_RE.test(id)) throw staffNotFound();
  const [s] = await db.select().from(schema.staff).where(and(eq(schema.staff.id, id), eq(schema.staff.studioId, ctx.studio.id), isNull(schema.staff.deletedAt)));
  if (!s) throw staffNotFound();
  return { id: s.id, name: s.name, role: s.role, phone: s.phone, telegram: s.telegram };
}

export async function createStaff(ctx: StudioCtx, input: z.infer<typeof staffSchema>) {
  const id = await db.transaction(async (tx) => {
    const [s] = await tx
      .insert(schema.staff)
      .values({ studioId: ctx.studio.id, name: input.name, role: input.role, phone: input.phone ?? null, telegram: input.telegram ?? null, createdBy: ctx.user.id })
      .returning({ id: schema.staff.id });
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "staff", entityId: s.id, action: "create", diff: { name: input.name, role: input.role } });
    return s.id;
  });
  return { staff: await getStaff(ctx, id) };
}

export async function patchStaff(ctx: StudioCtx, id: string, input: z.infer<typeof staffPatch>) {
  const before = await getStaff(ctx, id);
  const set = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  if (!Object.keys(set).length) return { staff: before };
  await db.transaction(async (tx) => {
    await tx.update(schema.staff).set(set).where(and(eq(schema.staff.id, id), eq(schema.staff.studioId, ctx.studio.id)));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "staff", entityId: id, action: "update", diff: set });
  });
  return { staff: await getStaff(ctx, id) };
}

/* Soft delete; their future assignments are released so those jobs show up as "Biriktirilmagan" */
export async function removeStaff(ctx: StudioCtx, id: string) {
  const s = await getStaff(ctx, id);
  await db.transaction(async (tx) => {
    await tx.update(schema.staff).set({ deletedAt: new Date() }).where(eq(schema.staff.id, id));
    await tx.execute(sql`delete from task_staff ts using tasks t where t.id = ts.task_id and ts.staff_id = ${id} and t.day >= ${todayISO()}`);
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "staff", entityId: id, action: "delete", diff: { name: s.name } });
  });
  return { ok: true };
}

/* ── tasks ── */
async function checkRefs(ctx: StudioCtx, input: { orderId?: string | null; staffIds?: string[] }) {
  if (input.orderId) {
    const [o] = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(eq(schema.orders.id, input.orderId), eq(schema.orders.studioId, ctx.studio.id)));
    if (!o) throw new HttpError(422, "validation", "Buyurtma topilmadi", { fields: { orderId: "Buyurtma topilmadi" } });
  }
  const ids = [...new Set(input.staffIds ?? [])];
  if (ids.length) {
    const found = await db
      .select({ id: schema.staff.id })
      .from(schema.staff)
      .where(and(eq(schema.staff.studioId, ctx.studio.id), isNull(schema.staff.deletedAt), inArray(schema.staff.id, ids)));
    if (found.length !== ids.length) throw new HttpError(422, "validation", "Xodim topilmadi", { fields: { staffIds: "Xodim topilmadi" } });
  }
  return ids;
}
function checkDay(day: string) {
  const t = todayISO();
  if (day < addDays(t, -365) || day > addDays(t, 730)) throw new HttpError(422, "validation", "Sana oraliqdan tashqarida", { fields: { day: "Sana oraliqdan tashqarida" } });
}

export async function getTask(ctx: StudioCtx, id: string) {
  if (!UUID_RE.test(id)) throw taskNotFound();
  const { rows } = await db.execute<{
    id: string; order_id: string | null; kind: string; day: string; starts_at: string; ends_at: string | null; place: string | null; note: string | null;
    client: string | null; venue: string | null; event_type: string | null; event_date: string | null; total: string | null; paid: string | null;
  }>(sql`
    select t.id, t.order_id, t.kind, t.day::text, t.starts_at, t.ends_at, t.place, t.note,
           o.client_name as client, o.venue, o.event_type, o.event_date::text as event_date, o.total,
           (select coalesce(sum(p.amount), 0) from order_payments p where p.order_id = o.id and p.deleted_at is null) as paid
    from tasks t left join orders o on o.id = t.order_id
    where t.id = ${id} and t.studio_id = ${ctx.studio.id} and t.deleted_at is null`);
  const t = rows[0];
  if (!t) throw taskNotFound();
  const [crew, props] = await Promise.all([
    db.execute<{ id: string; name: string; role: string }>(sql`
      select s.id, s.name, s.role from task_staff ts join staff s on s.id = ts.staff_id where ts.task_id = ${id} order by ts.created_at`),
    t.order_id
      ? db.execute<{ name: string; code: string; qty: number }>(sql`
          select p.name, p.code, b.qty from prop_bookings b join props p on p.id = b.prop_id and p.deleted_at is null
          where b.order_id = ${t.order_id} order by p.name`)
      : Promise.resolve({ rows: [] as { name: string; code: string; qty: number }[] }),
  ]);
  const total = t.total === null ? null : Number(t.total);
  return {
    task: {
      id: t.id, orderId: t.order_id, kind: t.kind, day: t.day, startsAt: t.starts_at, endsAt: t.ends_at, place: t.place, note: t.note,
      order: t.order_id ? { client: t.client ?? "", venue: t.venue, eventType: t.event_type ?? "", date: t.event_date ?? "", total: total ?? 0, balance: (total ?? 0) - Number(t.paid ?? 0) } : null,
      staff: crew.rows,
      props: props.rows,
    },
  };
}

export async function createTask(ctx: StudioCtx, input: z.infer<typeof taskSchema>) {
  checkDay(input.day);
  const ids = await checkRefs(ctx, input);
  let place = input.place ?? null;
  if (!place && input.orderId) {
    const [o] = await db.select({ venue: schema.orders.venue }).from(schema.orders).where(eq(schema.orders.id, input.orderId));
    place = o?.venue ?? null;
  }
  const id = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(schema.tasks)
      .values({ studioId: ctx.studio.id, orderId: input.orderId ?? null, kind: input.kind, day: input.day, startsAt: input.startsAt, endsAt: input.endsAt ?? null, place, note: input.note ?? null, createdBy: ctx.user.id })
      .returning({ id: schema.tasks.id });
    if (ids.length) await tx.insert(schema.taskStaff).values(ids.map((staffId) => ({ taskId: t.id, staffId })));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "task", entityId: t.id, action: "create", diff: { ...input, staffIds: ids } });
    return t.id;
  });
  return getTask(ctx, id);
}

export async function patchTask(ctx: StudioCtx, id: string, input: z.infer<typeof taskPatch>) {
  await getTask(ctx, id);
  if (input.day) checkDay(input.day);
  const ids = input.staffIds ? await checkRefs(ctx, input) : (await checkRefs(ctx, { orderId: input.orderId }), null);
  const { staffIds: _drop, ...rest } = input;
  void _drop;
  const set = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
  await db.transaction(async (tx) => {
    if (Object.keys(set).length) await tx.update(schema.tasks).set({ ...set, updatedAt: new Date() }).where(and(eq(schema.tasks.id, id), eq(schema.tasks.studioId, ctx.studio.id)));
    if (ids) {
      await tx.delete(schema.taskStaff).where(eq(schema.taskStaff.taskId, id));
      if (ids.length) await tx.insert(schema.taskStaff).values(ids.map((staffId) => ({ taskId: id, staffId })));
    }
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "task", entityId: id, action: "update", diff: { ...set, ...(ids ? { staffIds: ids } : {}) } });
  });
  return getTask(ctx, id);
}

export async function removeTask(ctx: StudioCtx, id: string) {
  const { task } = await getTask(ctx, id);
  await db.transaction(async (tx) => {
    await tx.update(schema.tasks).set({ deletedAt: new Date() }).where(eq(schema.tasks.id, id));
    await audit(tx, { studioId: ctx.studio.id, actorId: ctx.user.id, entity: "task", entityId: id, action: "delete", diff: { kind: task.kind, day: task.day } });
  });
  return { ok: true };
}
