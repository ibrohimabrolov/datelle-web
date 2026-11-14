/* Datelle Studio API — integration tests against a running server.
   Server env: PANEL_DEV_LOGIN=1, TELEGRAM_BOT_TOKEN=<PANEL_TEST_BOT_TOKEN below>.
   Run: BASE=http://localhost:3100 npm run test:panel */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { Pool } from "pg";

const BASE = process.env.BASE ?? "http://localhost:3100";
export const PANEL_TEST_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "7000000001:AAtest_token_for_local_integration_only";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

class Client {
  cookie = "";
  constructor(private cookieName = "dt_panel") {}
  async req(path: string, opts: { method?: string; body?: unknown; headers?: Record<string, string>; origin?: string | null } = {}) {
    const headers: Record<string, string> = { ...(opts.headers ?? {}) };
    if (opts.body !== undefined) {
      headers["content-type"] ??= "application/json";
      if (opts.origin !== null) headers.origin = opts.origin ?? BASE;
    }
    if (this.cookie) headers.cookie = this.cookie;
    const res = await fetch(BASE + path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    const set = res.headers.getSetCookie().find((c) => c.startsWith(`${this.cookieName}=`));
    if (set) this.cookie = set.split(";")[0];
    return { status: res.status, json: await res.json().catch(() => null), setCookie: set ?? "" };
  }
  devLogin(id: number, firstName = "Test") {
    return this.req("/api/panel/auth/dev", { body: { id, firstName } });
  }
}

const tgId = () => 9_000_000_000 + Math.floor(Math.random() * 1e9);

function initData(user: object, authDate = Math.floor(Date.now() / 1000), extra: Record<string, string> = {}) {
  const fields: Record<string, string> = { auth_date: String(authDate), query_id: "AAtest", user: JSON.stringify(user), ...extra };
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(PANEL_TEST_BOT_TOKEN).digest();
  return new URLSearchParams({ ...fields, hash: createHmac("sha256", secret).update(dcs).digest("hex") }).toString();
}

before(async () => {
  await pool.query("delete from rate_limits where key like 'panel:%'");
});
after(() => pool.end());

describe("auth", () => {
  test("no cookie → 401 on /me", async () => {
    const r = await new Client().req("/api/panel/me");
    assert.equal(r.status, 401);
    assert.equal(r.json.error.code, "unauthorized");
  });

  test("Mini App initData signs in; cookie is httpOnly, panel-scoped", async () => {
    const c = new Client();
    const id = tgId();
    const r = await c.req("/api/panel/auth/telegram", {
      body: { initData: initData({ id, first_name: "Malika", last_name: "R", username: "malika_decor" }, undefined, { start_param: "inv_abcdefghijklmnop" }) },
    });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.user.name, "Malika R");
    assert.equal(r.json.user.username, "malika_decor");
    assert.deepEqual(r.json.studios, []);
    assert.equal(r.json.startParam, "inv_abcdefghijklmnop");
    assert.match(r.setCookie, /HttpOnly/i);
    assert.equal((await c.req("/api/panel/me")).status, 200);

    // same Telegram user again → same account, profile refreshed
    const again = await new Client().req("/api/panel/auth/telegram", { body: { initData: initData({ id, first_name: "Malika", username: "malika_new" }) } });
    assert.equal(again.json.user.id, r.json.user.id);
    assert.equal(again.json.user.username, "malika_new");
  });

  test("tampered, expired and cross-site initData are rejected", async () => {
    const good = initData({ id: tgId(), first_name: "A" });
    const forged = good.replace("first_name%22%3A%22A", "first_name%22%3A%22B");
    assert.notEqual(forged, good);
    const bad = await new Client().req("/api/panel/auth/telegram", { body: { initData: forged } });
    assert.equal(bad.status, 401);
    assert.equal(bad.json.error.code, "tg_bad_hash");

    const old = await new Client().req("/api/panel/auth/telegram", { body: { initData: initData({ id: tgId(), first_name: "A" }, Math.floor(Date.now() / 1000) - 90_000) } });
    assert.equal(old.json.error.code, "tg_expired");

    const csrf = await new Client().req("/api/panel/auth/telegram", { body: { initData: good }, origin: "https://evil.example" });
    assert.equal(csrf.status, 403);
  });

  test("a panel token never works as a marketplace session", async () => {
    const c = new Client();
    await c.devLogin(tgId());
    const token = c.cookie.split("=")[1];
    const site = await fetch(`${BASE}/api/me`, { headers: { cookie: `dt_session=${token}` } }).then((r) => r.json());
    assert.equal(site.user, null);
  });

  test("logout kills the session server-side", async () => {
    const c = new Client();
    await c.devLogin(tgId());
    const stolen = c.cookie;
    assert.equal((await c.req("/api/panel/auth/logout", { body: {} })).status, 200);
    const replay = await fetch(`${BASE}/api/panel/me`, { headers: { cookie: stolen } });
    assert.equal(replay.status, 401);
  });
});

describe("onboarding and tenancy", () => {
  const owner = new Client();
  const other = new Client();
  let studioId = "";
  let otherStudioId = "";

  before(async () => {
    await owner.devLogin(tgId(), "Owner");
    await other.devLogin(tgId(), "Other");
  });

  test("no studio yet → 409 no_studio", async () => {
    const r = await owner.req("/api/panel/studio");
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "no_studio");
  });

  test("validation speaks Uzbek, per field", async () => {
    const r = await owner.req("/api/panel/onboarding", { body: { name: " ", category: "x", dailyCapacity: 0 } });
    assert.equal(r.status, 422);
    assert.ok(r.json.error.fields.name && r.json.error.fields.category && r.json.error.fields.dailyCapacity);
  });

  test("creates the studio, makes the user owner, writes audit, starts the 90-day trial", async () => {
    const r = await owner.req("/api/panel/onboarding", { body: { name: "  Gulnoza Decor ", category: "dekor", dailyCapacity: 3 } });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    studioId = r.json.studio.id;
    assert.equal(r.json.studio.name, "Gulnoza Decor");
    assert.equal(r.json.studio.role, "owner");

    const s = await owner.req("/api/panel/studio");
    assert.equal(s.json.role, "owner");
    const { rows } = await pool.query("select action, entity from studio_events where studio_id = $1", [studioId]);
    assert.deepEqual(rows, [{ action: "create", entity: "studio" }]);
    const { rows: st } = await pool.query("select plan, trial_ends_at - current_date as days from studios where id = $1", [studioId]);
    assert.equal(st[0].plan, "founding");
    assert.ok(st[0].days >= 89 && st[0].days <= 91);
  });

  test("double tap cannot create a second studio", async () => {
    const [a, b] = await Promise.all([
      owner.req("/api/panel/onboarding", { body: { name: "Twin", category: "dekor", dailyCapacity: 3 } }),
      owner.req("/api/panel/onboarding", { body: { name: "Twin", category: "dekor", dailyCapacity: 3 } }),
    ]);
    assert.deepEqual([a.status, b.status], [409, 409]);
    const { rows } = await pool.query("select count(*)::int as n from studios where name = 'Twin'");
    assert.equal(rows[0].n, 0);
  });

  test("another studio is invisible: 404, not 403", async () => {
    otherStudioId = (await other.req("/api/panel/onboarding", { body: { name: "Lola Flowers", category: "floristika", dailyCapacity: 1 } })).json.studio.id;
    const peek = await owner.req("/api/panel/studio", { headers: { "x-studio-id": otherStudioId } });
    assert.equal(peek.status, 404);
    const junk = await owner.req("/api/panel/studio", { headers: { "x-studio-id": "'; drop table studios;--" } });
    assert.equal(junk.status, 404);
    const own = await other.req("/api/panel/studio", { headers: { "x-studio-id": otherStudioId } });
    assert.equal(own.json.studio.name, "Lola Flowers");
  });

  test("a manager sees the studio with role manager", async () => {
    const m = new Client();
    const me = (await m.devLogin(tgId(), "Manager")).json.user;
    await pool.query("insert into studio_members (studio_id, user_id, role) values ($1, $2, 'manager')", [studioId, me.id]);
    const r = await m.req("/api/panel/studio");
    assert.equal(r.json.role, "manager");
    assert.equal(r.json.studio.id, studioId);
    const list = await m.req("/api/panel/me");
    assert.deepEqual(list.json.studios.map((s: { role: string }) => s.role), ["manager"]);
  });

  test("daily cron builds tomorrow's digest from real orders (paid, soft-deleted and other days excluded)", async () => {
    const secret = process.env.PANEL_TEST_CRON_SECRET ?? "cron_test_secret_1234567890";
    const tomorrow = new Date(Date.now() + 5 * 3600e3 + 86_400e3).toISOString().slice(0, 10);
    const { rows: [m] } = await pool.query("select user_id from studio_members where studio_id = $1 and role = 'owner'", [studioId]);
    const ins = (date: string, client: string, total: number, status = "active") =>
      pool.query(
        "insert into orders (studio_id, code, event_date, event_type, client_name, client_phone, total, status, created_by) values ($1, $2, $3, 'toy', $4, '+998901234567', $5, $6, $7) returning id",
        [studioId, `DS-T${Math.floor(Math.random() * 1e9)}`, date, client, total, status, m.user_id],
      );
    const a = (await ins(tomorrow, "Malika", 10_000_000)).rows[0].id;
    await ins(tomorrow, "Bekor", 5_000_000, "cancelled");
    await ins("2030-01-01", "Boshqa kun", 1_000_000);
    await pool.query("insert into order_payments (order_id, amount, paid_on, created_by) values ($1, 3000000, current_date, $2)", [a, m.user_id]);
    await pool.query("insert into order_payments (order_id, amount, paid_on, created_by, deleted_at) values ($1, 7000000, current_date, $2, now())", [a, m.user_id]);

    assert.equal((await fetch(`${BASE}/api/cron/daily`)).status, 401);
    const r = await fetch(`${BASE}/api/cron/daily`, { headers: { authorization: `Bearer ${secret}` } }).then((x) => x.json());
    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(r.date, tomorrow);
    // owner + manager of this studio have Telegram ids → 2 deliveries attempted (Telegram itself is unreachable in tests)
    assert.ok(r.studios >= 1);
    assert.ok(r.sent + r.failed >= 2);
  });

  test("one owner per studio is enforced by the database", async () => {
    const intruder = (await new Client().devLogin(tgId())).json.user;
    await assert.rejects(pool.query("insert into studio_members (studio_id, user_id, role) values ($1, $2, 'owner')", [studioId, intruder.id]), /studio_members_one_owner/);
  });
});

describe("calendar", () => {
  const owner = new Client();
  const stranger = new Client();
  let studioId = "";
  let userId = "";
  const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
  const plus = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400e3).toISOString().slice(0, 10);
  const target = plus(10);
  const month = target.slice(0, 7);

  before(async () => {
    userId = (await owner.devLogin(tgId(), "Cal")).json.user.id;
    studioId = (await owner.req("/api/panel/onboarding", { body: { name: "Cal Studio", category: "dekor", dailyCapacity: 2 } })).json.studio.id;
    await stranger.devLogin(tgId(), "Stranger");
    await stranger.req("/api/panel/onboarding", { body: { name: "Other", category: "dekor", dailyCapacity: 3 } });
    const ins = (date: string, client: string, total: number, status = "active") =>
      pool.query(
        "insert into orders (studio_id, code, event_date, event_type, venue, client_name, client_phone, total, status, created_by) values ($1, $2, $3, 'toy', 'Bahor', $4, '+998901234567', $5, $6, $7) returning id",
        [studioId, `DS-C${Math.floor(Math.random() * 1e9)}`, date, client, total, status, userId],
      );
    const a = (await ins(target, "Nodira", 5_000_000)).rows[0].id;
    await ins(target, "Bekor", 1_000_000, "cancelled");
    await pool.query("insert into order_payments (order_id, amount, paid_on, created_by) values ($1, 2000000, current_date, $2)", [a, userId]);
  });

  test("month view: status, load, balance; cancelled orders ignored", async () => {
    const r = await owner.req(`/api/panel/calendar?month=${month}`);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.capacity, 2);
    const d = r.json.days.find((x: { date: string }) => x.date === target);
    assert.equal(d.load, 1);
    assert.equal(d.status, "limited"); // capacity 2, one order → "1 joy"
    assert.deepEqual(d.orders.map((o: { client: string; balance: number }) => [o.client, o.balance]), [["Nodira", 3_000_000]]);
    assert.ok(r.json.summary.events >= 1 && r.json.summary.due >= 1);
  });

  test("bad month → 422, stranger sees only their own (empty) calendar", async () => {
    assert.equal((await owner.req("/api/panel/calendar?month=2026-13")).status, 422);
    const s = await stranger.req(`/api/panel/calendar?month=${month}`);
    assert.equal(s.json.days.length, 0);
    const peek = await stranger.req(`/api/panel/calendar?month=${month}`, { headers: { "x-studio-id": studioId } });
    assert.equal(peek.status, 404);
  });

  test("close a day with orders → warning; reason required; audit written", async () => {
    const noReason = await owner.req(`/api/panel/days/${target}`, { method: "PUT", body: { blocked: true } });
    assert.equal(noReason.status, 422);
    assert.ok(noReason.json.error.fields.reason);

    const r = await owner.req(`/api/panel/days/${target}`, { method: "PUT", body: { blocked: true, reason: "tamir", note: "Zal taʼmirda" } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.day.status, "blocked");
    assert.equal(r.json.day.reason, "tamir");
    assert.deepEqual(r.json.warnings, ["has_orders"]);
    const { rows } = await pool.query("select action from studio_events where studio_id = $1 and entity = 'day'", [studioId]);
    assert.deepEqual(rows.map((x) => x.action), ["block"]);
  });

  test("stranger cannot close our day (404), past days cannot be closed, junk dates 404", async () => {
    const r = await stranger.req(`/api/panel/days/${plus(11)}`, { method: "PUT", body: { blocked: true, reason: "dam" }, headers: { "x-studio-id": studioId } });
    assert.equal(r.status, 404);
    const past = await owner.req(`/api/panel/days/${plus(-1)}`, { method: "PUT", body: { blocked: true, reason: "dam" } });
    assert.equal(past.status, 422);
    assert.equal((await owner.req(`/api/panel/days/2026-02-30`, { method: "PUT", body: { blocked: false } })).status, 404);
  });

  test("reopen removes the row and status falls back to orders", async () => {
    const r = await owner.req(`/api/panel/days/${target}`, { method: "PUT", body: { blocked: false } });
    assert.equal(r.json.day.status, "limited");
    assert.deepEqual(r.json.warnings, []);
    const { rows } = await pool.query("select count(*)::int as n from studio_days where studio_id = $1", [studioId]);
    assert.equal(rows[0].n, 0);
    // reopening an already-open day is a no-op: no extra audit row
    await owner.req(`/api/panel/days/${target}`, { method: "PUT", body: { blocked: false } });
    const { rows: ev } = await pool.query("select action from studio_events where studio_id = $1 and entity = 'day' order by created_at", [studioId]);
    assert.deepEqual(ev.map((x) => x.action), ["block", "unblock"]);
  });
});
