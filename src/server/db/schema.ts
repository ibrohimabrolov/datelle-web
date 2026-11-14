import { sql } from "drizzle-orm";
import {
  bigint, boolean, check, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

/* ───────────────────────────────────────────────
   Datelle — Postgres schema (v1)
   Money: integer soʻm (bigint). Dates: `date` in Asia/Tashkent.
   ─────────────────────────────────────────────── */

export const userRole = pgEnum("user_role", ["client", "vendor", "admin"]);
export const category = pgEnum("category", ["dekor", "floristika"]);
export const vendorStatus = pgEnum("vendor_status", ["active", "hidden"]);
export const requestType = pgEnum("request_type", ["booking", "quote"]);
export const requestStatus = pgEnum("request_status", [
  "pending", // client sent, waiting for vendor
  "confirmed", // vendor accepted, waiting for deposit
  "declined", // vendor said no
  "expired", // vendor did not answer in time
  "cancelled", // client withdrew
  "paid", // deposit received — date locked
  "completed",
]);
export const actor = pgEnum("actor", ["client", "vendor", "system", "admin"]);
export const applicationStatus = pgEnum("application_status", ["new", "reviewing", "approved", "rejected"]);
export const sessionScope = pgEnum("session_scope", ["site", "panel"]);

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").unique(), // +998XXXXXXXXX — null for Telegram-only (Datelle Studio) users
  name: text("name"),
  telegramId: bigint("telegram_id", { mode: "number" }).unique(),
  telegramUsername: text("telegram_username"),
  photoUrl: text("photo_url"),
  role: userRole("role").notNull().default("client"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(token) — raw token lives only in the cookie
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    userAgent: text("user_agent"),
    /* "site" = marketplace (dt_session), "panel" = Datelle Studio (dt_panel). A token never works in the other area. */
    scope: sessionScope("scope").notNull().default("site"),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    phone: text("phone").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: ts("expires_at").notNull(),
    consumedAt: ts("consumed_at"),
    ip: text("ip"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("otp_phone_created_idx").on(t.phone, t.createdAt)],
);

export const vendors = pgTable(
  "vendors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    category: category("category").notNull(),
    district: text("district").notNull(),
    rating: numeric("rating", { precision: 2, scale: 1, mode: "number" }).notNull().default(0),
    reviewsCount: integer("reviews_count").notNull().default(0),
    priceFrom: bigint("price_from", { mode: "number" }).notNull(),
    responseHours: integer("response_hours").notNull().default(2),
    verified: boolean("verified").notNull().default(false),
    completedCount: integer("completed_count").notNull().default(0),
    events: text("events").array().notNull().default(sql`'{}'::text[]`),
    dailyCapacity: integer("daily_capacity").notNull().default(3),
    rank: integer("rank").notNull().default(1000),
    imageKey: text("image_key").notNull(), // maps to a bundled asset until uploads exist
    about: text("about").notNull().default(""),
    ownerId: uuid("owner_id").references(() => users.id),
    status: vendorStatus("status").notNull().default("active"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("vendors_cat_status_idx").on(t.category, t.status)],
);

export const packages = pgTable(
  "packages",
  {
    id: text("id").primaryKey(),
    vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    includes: text("includes").notNull().default(""),
    price: bigint("price", { mode: "number" }).notNull(),
    depositPct: integer("deposit_pct").notNull().default(30),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("packages_vendor_idx").on(t.vendorId)],
);

/* One row per vendor per day that differs from "empty day with default capacity". */
export const vendorDays = pgTable(
  "vendor_days",
  {
    vendorId: uuid("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    booked: integer("booked").notNull().default(0),
    blocked: boolean("blocked").notNull().default(false), // vendor closed the day (offline booking, holiday)
  },
  (t) => [primaryKey({ columns: [t.vendorId, t.day] }), index("vendor_days_day_idx").on(t.day)],
);

export const requests = pgTable(
  "requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // DT-B-1042 — shown to humans
    type: requestType("type").notNull(),
    status: requestStatus("status").notNull().default("pending"),
    userId: uuid("user_id").notNull().references(() => users.id),
    vendorId: uuid("vendor_id").notNull().references(() => vendors.id),
    packageId: text("package_id").references(() => packages.id),
    eventDate: date("event_date", { mode: "string" }).notNull(),
    eventType: text("event_type"),
    guests: integer("guests"),
    venue: text("venue"),
    budget: text("budget"),
    notes: text("notes"),
    contactName: text("contact_name").notNull(),
    contactPhone: text("contact_phone").notNull(),
    price: bigint("price", { mode: "number" }), // snapshot at request time
    deposit: bigint("deposit", { mode: "number" }),
    respondBy: ts("respond_by").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("requests_user_idx").on(t.userId, t.createdAt),
    index("requests_vendor_day_idx").on(t.vendorId, t.eventDate),
    // one open request per client/vendor/date — stops double taps and spam
    uniqueIndex("requests_open_unique")
      .on(t.userId, t.vendorId, t.eventDate)
      .where(sql`status in ('pending','confirmed','paid')`),
  ],
);

export const requestEvents = pgTable(
  "request_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => requests.id, { onDelete: "cascade" }),
    fromStatus: requestStatus("from_status"),
    toStatus: requestStatus("to_status").notNull(),
    actor: actor("actor").notNull(),
    note: text("note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("request_events_req_idx").on(t.requestId)],
);

export const partnerApplications = pgTable("partner_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  studioName: text("studio_name").notNull(),
  category: category("category").notNull(),
  district: text("district").notNull(),
  instagram: text("instagram"),
  legalForm: text("legal_form").notNull(),
  contactName: text("contact_name").notNull(),
  phone: text("phone").notNull(),
  status: applicationStatus("status").notNull().default("new"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull(),
  eventDate: date("event_date", { mode: "string" }),
  context: jsonb("context").$type<Record<string, unknown>>(),
  handled: boolean("handled").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/* Fixed-window counters — work across serverless instances */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: ts("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

/* ───────────────────────────────────────────────
   Datelle Studio — internal tool for studios (claude/Datelle-STUDIO-TECH.md §2)
   Multi-tenant: every row belongs to a studio. Derived numbers (balance, day load,
   dashboard) are always computed from orders + order_payments — no counters, no drift.
   ─────────────────────────────────────────────── */

export const studioPlan = pgEnum("studio_plan", ["founding", "standard"]);
export const memberRole = pgEnum("member_role", ["owner", "manager"]);
export const orderStatus = pgEnum("order_status", ["active", "done", "cancelled"]);
export const paymentMethod = pgEnum("payment_method", ["cash", "card", "transfer"]);

export const studios = pgTable(
  "studios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: category("category").notNull(),
    dailyCapacity: integer("daily_capacity").notNull().default(3),
    vendorId: uuid("vendor_id").references(() => vendors.id, { onDelete: "set null" }), // future link to the marketplace
    plan: studioPlan("plan").notNull().default("founding"),
    trialEndsAt: date("trial_ends_at", { mode: "string" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [check("studios_capacity_range", sql`${t.dailyCapacity} between 1 and 20`)],
);

export const studioMembers = pgTable(
  "studio_members",
  {
    studioId: uuid("studio_id").notNull().references(() => studios.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull(),
    remindersOn: boolean("reminders_on").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.studioId, t.userId] }),
    index("studio_members_user_idx").on(t.userId),
    // exactly one owner per studio
    uniqueIndex("studio_members_one_owner").on(t.studioId).where(sql`role = 'owner'`),
  ],
);

export const studioInvites = pgTable(
  "studio_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studioId: uuid("studio_id").notNull().references(() => studios.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("manager"),
    tokenHash: text("token_hash").notNull().unique(), // sha256 — raw token only in the link
    createdBy: uuid("created_by").notNull().references(() => users.id),
    expiresAt: ts("expires_at").notNull(),
    usedBy: uuid("used_by").references(() => users.id),
    usedAt: ts("used_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("studio_invites_studio_idx").on(t.studioId)],
);

/* Row only for a day that differs from "open". */
export const studioDays = pgTable(
  "studio_days",
  {
    studioId: uuid("studio_id").notNull().references(() => studios.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    blocked: boolean("blocked").notNull().default(false),
    note: text("note"),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studioId, t.day] })],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studioId: uuid("studio_id").notNull().references(() => studios.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(), // DS-104271 — shown to humans
    eventDate: date("event_date", { mode: "string" }).notNull(),
    eventType: text("event_type").notNull(), // EVENT_TYPES slug; validated in the API, text so studios can grow the list
    venue: text("venue"),
    guests: integer("guests"),
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone").notNull(),
    total: bigint("total", { mode: "number" }).notNull(),
    status: orderStatus("status").notNull().default("active"),
    notes: text("notes"),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    cancelledAt: ts("cancelled_at"),
  },
  (t) => [
    index("orders_studio_date_idx").on(t.studioId, t.eventDate),
    index("orders_studio_status_idx").on(t.studioId, t.status),
    check("orders_total_nonneg", sql`${t.total} >= 0`),
    check("orders_guests_pos", sql`${t.guests} is null or ${t.guests} > 0`),
  ],
);

/* Money rows are never physically deleted — soft delete keeps the audit honest */
export const orderPayments = pgTable(
  "order_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
    amount: bigint("amount", { mode: "number" }).notNull(),
    paidOn: date("paid_on", { mode: "string" }).notNull(),
    method: paymentMethod("method").notNull().default("cash"),
    note: text("note"),
    createdBy: uuid("created_by").notNull().references(() => users.id),
    createdAt: ts("created_at").notNull().defaultNow(),
    deletedAt: ts("deleted_at"),
    deletedBy: uuid("deleted_by").references(() => users.id),
  },
  (t) => [index("order_payments_order_idx").on(t.orderId), check("order_payments_amount_pos", sql`${t.amount} > 0`)],
);

/* Append-only audit */
export const studioEvents = pgTable(
  "studio_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studioId: uuid("studio_id").notNull().references(() => studios.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    entity: text("entity").notNull(), // order | payment | day | member | studio | invite
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(), // create | update | status | delete
    diff: jsonb("diff").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("studio_events_entity_idx").on(t.studioId, t.entity, t.entityId, t.createdAt)],
);
