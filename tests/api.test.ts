/* Integration tests against a running server: BASE=http://localhost:3100 (SMS_PROVIDER=console) */
import { before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

const BASE = process.env.BASE ?? "http://localhost:3100";
const host = new URL(BASE).host;

class Client {
  cookie = "";
  async req(path: string, opts: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.body !== undefined) {
      headers["content-type"] ??= "application/json";
      headers.origin ??= BASE;
    }
    if (this.cookie) headers.cookie = this.cookie;
    const res = await fetch(BASE + path, { method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"), headers, body: opts.body === undefined ? undefined : typeof opts.body === "string" ? opts.body : JSON.stringify(opts.body) });
    const set = res.headers.get("set-cookie");
    if (set) this.cookie = set.split(";")[0];
    const json = await res.json().catch(() => null);
    return { status: res.status, json, headers: res.headers };
  }
  async login(phone: string, name = "Test") {
    const otp = await this.req("/api/auth/otp", { body: { phone } });
    assert.equal(otp.status, 200, JSON.stringify(otp.json));
    const v = await this.req("/api/auth/verify", { body: { phone, code: otp.json.devCode, name } });
    assert.equal(v.status, 200, JSON.stringify(v.json));
    return v.json.user;
  }
}

const rnd = () => `9${Math.floor(10 + Math.random() * 89)}${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`.slice(0, 9);
const phoneA = `+9989${rnd().slice(1)}`.slice(0, 13);
const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const plus = (n: number) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

let freeDay = "";
let busyDay = "";
before(async () => {
  // fresh rate-limit windows so repeated local runs don't trip the per-IP limits
  if (process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("delete from rate_limits");
    await pool.end();
  }
  const c = new Client();
  for (const m of [plus(1).slice(0, 7), plus(32).slice(0, 7)]) {
    const r = await c.req(`/api/vendors/gulnoza-decor/calendar?month=${m}`);
    for (const d of r.json.days) {
      if (d.date <= today) continue;
      if (!freeDay && d.status !== "busy") freeDay = d.date;
      if (!busyDay && d.status === "busy") busyDay = d.date;
    }
  }
  assert.ok(freeDay && busyDay, "seed must contain both free and busy days");
});

describe("catalogue", () => {
  test("health", async () => {
    const r = await new Client().req("/api/health");
    assert.equal(r.status, 200);
    assert.equal(r.json.db, "up");
  });
  test("search returns hits for a date and is cacheable", async () => {
    const r = await new Client().req(`/api/vendors/search?sana=${plus(10)}&tadbir=all&byudjet=0&f=&limit=5`);
    assert.equal(r.status, 200);
    assert.ok(r.json.total >= r.json.items.length);
    assert.ok(r.json.items.every((x: { status: string }) => x.status !== "busy"));
    assert.match(r.headers.get("cache-control") ?? "", /s-maxage/);
  });
  test("garbage filters fall back to defaults", async () => {
    const r = await new Client().req("/api/vendors/search?sana=2020-99-99&tur=x&byudjet=7&f=zzz&saralash=hack");
    assert.equal(r.status, 200);
    assert.equal(r.json.filters.tur, "dekor");
    assert.equal(r.json.filters.saralash, "tavsiya");
  });
  test("availability: one row per day; past ranges rejected", async () => {
    const r = await new Client().req(`/api/availability?from=${plus(1)}&days=10&tadbir=all&byudjet=0&f=`);
    assert.equal(r.json.days.length, 10);
    const bad = await new Client().req(`/api/availability?from=2020-01-01&days=5`);
    assert.equal(bad.status, 422);
  });
  test("calendar: bad month 422, unknown vendor 404", async () => {
    assert.equal((await new Client().req("/api/vendors/gulnoza-decor/calendar?month=2026-13")).status, 422);
    assert.equal((await new Client().req("/api/vendors/nope/calendar")).status, 404);
  });
});

describe("auth", () => {
  test("invalid phone → 422 with field error", async () => {
    const r = await new Client().req("/api/auth/otp", { body: { phone: "123" } });
    assert.equal(r.status, 422);
    assert.ok(r.json.error.fields.phone);
  });
  test("non-JSON and foreign origin are refused", async () => {
    const c = new Client();
    assert.equal((await c.req("/api/auth/otp", { body: "phone=1", headers: { "content-type": "text/plain" } })).status, 415);
    assert.equal((await c.req("/api/auth/otp", { body: { phone: phoneA }, headers: { origin: "https://evil.example" } })).status, 403);
  });
  test("otp: cooldown, wrong code counts attempts, right code logs in", async () => {
    const c = new Client();
    const phone = `+99893${String(Date.now()).slice(-7)}`;
    const first = await c.req("/api/auth/otp", { body: { phone } });
    assert.equal(first.status, 200);
    assert.match(first.json.devCode, /^\d{6}$/);
    const again = await c.req("/api/auth/otp", { body: { phone } });
    assert.equal(again.status, 429);
    assert.equal(again.json.error.code, "otp_cooldown");
    const wrong = await c.req("/api/auth/verify", { body: { phone, code: first.json.devCode === "000000" ? "111111" : "000000" } });
    assert.equal(wrong.status, 400);
    assert.match(wrong.json.error.message, /4 ta urinish/);
    const ok = await c.req("/api/auth/verify", { body: { phone, code: first.json.devCode, name: "Aziz" } });
    assert.equal(ok.status, 200);
    assert.ok(c.cookie.startsWith("dt_session="));
    const me = await c.req("/api/me");
    assert.equal(me.json.user.phone, phone);
    const reuse = await new Client().req("/api/auth/verify", { body: { phone, code: first.json.devCode } });
    assert.equal(reuse.status, 400, "a code works once");
  });
  test("logout ends the session", async () => {
    const c = new Client();
    await c.login(`+99894${String(Date.now()).slice(-7)}`);
    await c.req("/api/auth/logout", { body: {} });
    const me = await c.req("/api/me");
    assert.equal(me.json.user, null);
  });
});

describe("requests", () => {
  const a = new Client();
  const b = new Client();
  let id = "";
  before(async () => {
    await a.login(`+99890${String(Date.now()).slice(-7)}`, "Dilnoza");
    await b.login(`+99891${String(Date.now()).slice(-7)}`, "Boshqa");
  });

  test("anonymous create → 401", async () => {
    const r = await new Client().req("/api/requests", { body: { type: "booking", vendor: "gulnoza-decor", date: freeDay, packageId: "gulnoza-decor-standart", name: "X" } });
    assert.equal(r.status, 401);
  });
  test("booking: created with price snapshot and deadline", async () => {
    const r = await a.req("/api/requests", { body: { type: "booking", vendor: "gulnoza-decor", date: freeDay, packageId: "gulnoza-decor-standart", name: "Dilnoza" } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    id = r.json.request.id;
    assert.equal(r.json.request.status, "pending");
    assert.equal(r.json.request.price, 3_000_000);
    assert.equal(r.json.request.deposit, 900_000);
    assert.match(r.json.request.code, /^DT-B-\d{6}$/);
    assert.ok(new Date(r.json.request.respondBy) > new Date());
  });
  test("same vendor+date twice → 409 duplicate pointing at the first", async () => {
    const r = await a.req("/api/requests", { body: { type: "booking", vendor: "gulnoza-decor", date: freeDay, packageId: "gulnoza-decor-fotozona", name: "Dilnoza" } });
    assert.equal(r.status, 409);
    assert.equal(r.json.error.id, id);
  });
  test("busy day → 409; past date → 422; foreign package → 422; missing package → 422", async () => {
    assert.equal((await a.req("/api/requests", { body: { type: "booking", vendor: "gulnoza-decor", date: busyDay, packageId: "gulnoza-decor-standart", name: "Dilnoza" } })).json.error.code, "day_busy");
    assert.equal((await a.req("/api/requests", { body: { type: "booking", vendor: "gulnoza-decor", date: today, packageId: "gulnoza-decor-standart", name: "Dilnoza" } })).status, 422);
    assert.equal((await a.req("/api/requests", { body: { type: "booking", vendor: "gulnoza-decor", date: freeDay, packageId: "lola-studio-standart", name: "Dilnoza" } })).status, 422);
    assert.equal((await a.req("/api/requests", { body: { type: "booking", vendor: "lola-studio", date: freeDay, name: "Dilnoza" } })).status, 422);
  });
  test("quote without package", async () => {
    const r = await a.req("/api/requests", { body: { type: "quote", vendor: "lola-studio", date: plus(40), eventType: "toy", guests: 250, venue: "Versal", budget: "5–15 mln", name: "Dilnoza" } });
    if (r.status === 409) return; // day happened to be busy in the seed
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.match(r.json.request.code, /^DT-R-\d{6}$/);
  });
  test("list is private to its owner", async () => {
    const mine = await a.req("/api/requests");
    assert.ok(mine.json.items.some((x: { id: string }) => x.id === id));
    const theirs = await b.req("/api/requests");
    assert.ok(!theirs.json.items.some((x: { id: string }) => x.id === id));
    assert.equal((await b.req(`/api/requests/${id}`)).status, 404);
    assert.equal((await a.req("/api/requests/not-a-uuid")).status, 404);
  });
  test("cancel: owner only, once", async () => {
    assert.equal((await b.req(`/api/requests/${id}/cancel`, { body: {} })).status, 404);
    const r = await a.req(`/api/requests/${id}/cancel`, { body: {} });
    assert.equal(r.status, 200);
    assert.equal(r.json.request.status, "cancelled");
    assert.deepEqual(r.json.request.events.map((e: { toStatus: string }) => e.toStatus), ["pending", "cancelled"]);
    assert.equal((await a.req(`/api/requests/${id}/cancel`, { body: {} })).status, 409);
  });
  test("after cancel the same date can be requested again", async () => {
    const r = await a.req("/api/requests", { body: { type: "booking", vendor: "gulnoza-decor", date: freeDay, packageId: "gulnoza-decor-standart", name: "Dilnoza" } });
    assert.equal(r.status, 201);
  });
});

describe("forms", () => {
  test("partner application", async () => {
    const ok = await new Client().req("/api/partners", { body: { studioName: "Test Decor", category: "dekor", district: "Yunusobod", legalForm: "YaTT", contactName: "Gulnoza", phone: "93 333 44 55" } });
    assert.equal(ok.status, 201);
    const bad = await new Client().req("/api/partners", { body: { studioName: "T", category: "dekor", district: "Nowhere", legalForm: "YaTT", contactName: "G", phone: "1" } });
    assert.equal(bad.status, 422);
    assert.ok(bad.json.error.fields.studioName && bad.json.error.fields.district && bad.json.error.fields.phone);
  });
  test("concierge lead", async () => {
    const r = await new Client().req("/api/leads", { body: { phone: "+998 90 555 12 34", date: plus(9), context: { tur: "floristika" } } });
    assert.equal(r.status, 201);
  });
});

describe("admin", () => {
  const admin = new Client();
  const client = new Client();
  const pw = process.env.ADMIN_PASSWORD ?? "";
  const pool = () => new Pool({ connectionString: process.env.DATABASE_URL });
  const booked = async (slug: string, day: string) => {
    const p = pool();
    const { rows } = await p.query("select coalesce((select booked from vendor_days d join vendors v on v.id = d.vendor_id where v.slug = $1 and d.day = $2), 0) as n", [slug, day]);
    await p.end();
    return Number(rows[0].n);
  };

  test("closed without the cookie; wrong password 401; forged cookie 401", async () => {
    assert.ok(pw, "ADMIN_PASSWORD must be set for admin tests");
    assert.equal((await new Client().req("/api/admin/stats")).status, 401);
    assert.equal((await new Client().req("/api/admin/login", { body: { password: "wrong" } })).status, 401);
    const forged = new Client();
    forged.cookie = `dt_admin=${Date.now() + 86_400_000}.${"a".repeat(64)}`;
    assert.equal((await forged.req("/api/admin/stats")).status, 401);
    assert.equal((await new Client().req("/api/admin/login", { body: { password: pw }, headers: { origin: "https://evil.example" } })).status, 403);
  });

  test("login → stats", async () => {
    const r = await admin.req("/api/admin/login", { body: { password: pw } });
    assert.equal(r.status, 200);
    assert.match(r.headers.get("set-cookie") ?? "", /HttpOnly/i);
    const s = await admin.req("/api/admin/stats");
    assert.equal(s.status, 200);
    assert.equal(typeof s.json.pending, "number");
    assert.equal(s.headers.get("cache-control"), "no-store");
  });

  test("confirm takes a slot; client cancel gives it back; illegal moves 409", async () => {
    await client.login(`+99890${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`, "Admin Test");
    const day = plus(200 + Math.floor(Math.random() * 30));
    const created = await client.req("/api/requests", { body: { type: "booking", vendor: "lola-studio", date: day, packageId: "lola-studio-standart", name: "Admin Test" } });
    if (created.status === 409) return; // random day happened to be busy — skip rather than flake
    assert.equal(created.status, 201, JSON.stringify(created.json));
    const id = created.json.request.id;
    const list = await admin.req(`/api/admin/requests?holat=pending&q=${encodeURIComponent("Admin Test")}`);
    assert.ok(list.json.requests.some((x: { id: string }) => x.id === id));

    const before = await booked("lola-studio", day);
    assert.equal((await admin.req(`/api/admin/requests/${id}`, { body: { to: "completed" } })).status, 409);
    const c = await admin.req(`/api/admin/requests/${id}`, { body: { to: "confirmed" } });
    assert.equal(c.status, 200);
    assert.equal(await booked("lola-studio", day), before + 1);
    const mine = await client.req(`/api/requests/${id}`);
    assert.equal(mine.json.request.status, "confirmed");

    assert.equal((await client.req(`/api/requests/${id}/cancel`, { body: {} })).status, 200);
    assert.equal(await booked("lola-studio", day), before);
    assert.equal((await admin.req(`/api/admin/requests/${id}`, { body: { to: "confirmed" } })).status, 409);
    assert.equal((await admin.req(`/api/admin/requests/not-a-uuid`, { body: { to: "confirmed" } })).status, 404);
  });

  test("hide vendor removes it from search; block day makes it busy", async () => {
    const vs = await admin.req("/api/admin/vendors");
    const v = vs.json.vendors.find((x: { slug: string }) => x.slug === "navroz-decor") ?? vs.json.vendors[0];
    const sana = plus(15);
    const inSearch = async () => {
      const r = await new Client().req(`/api/vendors/search?sana=${sana}&tadbir=all&byudjet=0&f=&limit=60&tur=${v.category}&_=${Math.random()}`);
      return r.json.vendors?.some((x: { slug: string }) => x.slug === v.slug) ?? false;
    };
    assert.equal((await admin.req(`/api/admin/vendors/${v.id}`, { body: { status: "hidden" } })).status, 200);
    assert.equal(await inSearch(), false);
    assert.equal((await admin.req(`/api/admin/vendors/${v.id}`, { body: { status: "active" } })).status, 200);

    const day = plus(150);
    assert.equal((await admin.req(`/api/admin/vendors/${v.id}/days`, { body: { day, blocked: true } })).status, 200);
    const cal = await new Client().req(`/api/vendors/${v.slug}/calendar?month=${day.slice(0, 7)}&_=${Math.random()}`);
    assert.equal(cal.json.days.find((d: { date: string }) => d.date === day).status, "busy");
    assert.equal((await admin.req(`/api/admin/vendors/${v.id}/days`, { body: { day, blocked: false } })).status, 200);
    assert.equal((await admin.req(`/api/admin/vendors/${v.id}/days`, { body: { day: plus(-2), blocked: true } })).status, 422);
    assert.equal((await admin.req(`/api/admin/vendors/${v.id}`, { body: { dailyCapacity: 0 } })).status, 422);
  });

  test("applications and leads change state", async () => {
    const apps = await admin.req("/api/admin/applications");
    assert.equal(apps.status, 200);
    const a = apps.json.applications[0];
    if (a) assert.equal((await admin.req(`/api/admin/applications/${a.id}`, { body: { status: "reviewing" } })).json.status, "reviewing");
    const leads = await admin.req("/api/admin/leads");
    const l = leads.json.leads[0];
    if (l) assert.equal((await admin.req(`/api/admin/leads/${l.id}`, { body: { handled: true } })).json.handled, true);
  });

  test("logout", async () => {
    await admin.req("/api/admin/logout", { body: {} });
    assert.equal((await admin.req("/api/admin/stats")).status, 401);
  });
});

void host;
