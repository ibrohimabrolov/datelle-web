import { sql } from "drizzle-orm";
import {
  bigint, boolean, date, index, integer, jsonb, numeric, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
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

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: text("phone").notNull().unique(), // +998XXXXXXXXX
  name: text("name"),
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
