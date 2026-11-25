/* Floreal API — integration tests against a running server.
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

describe("desktop bot sign-in", () => {
  const hookSecret = createHmac("sha256", PANEL_TEST_BOT_TOKEN).update("floreal-webhook-v1").digest("hex");
  const webhook = (update: object) =>
    fetch(`${BASE}/api/telegram/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": hookSecret },
      body: JSON.stringify({ update_id: 1, ...update }),
    }).then((r) => r.json());
  const startMsg = (from: number, start: string) => ({ message: { message_id: 1, chat: { id: from, type: "private" }, from: { id: from, first_name: "Dilnoza" }, text: `/start ${start}` } });
  const press = (from: number, data: string) => ({
    callback_query: { id: "cb1", from: { id: from, first_name: "Dilnoza", username: "dilnoza_flowers" }, data, message: { message_id: 7, chat: { id: from, type: "private" } } },
  });
  // browser keeps both dt_login and dt_panel
  async function browser() {
    const jar = new Map<string, string>();
    return async (path: string, body: unknown = {}) => {
      const res = await fetch(BASE + path, {
        method: "POST",
        headers: { "content-type": "application/json", origin: BASE, cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
        body: JSON.stringify(body),
      });
      for (const c of res.headers.getSetCookie()) {
        const [kv] = c.split(";");
        const [k, v] = kv.split("=");
        if (v) jar.set(k, v);
        else jar.delete(k);
      }
      return { status: res.status, json: await res.json(), jar };
    };
  }

  test("bot approval signs in the creating browser exactly once", async () => {
    const post = await browser();
    const created = await post("/api/panel/auth/bot");
    assert.equal(created.status, 200, JSON.stringify(created.json));
    assert.match(created.json.start, /^login_[A-Za-z0-9_-]{22}$/);
    assert.match(created.json.code, /^\d{4}$/);
    assert.ok(created.json.url.endsWith(created.json.start));
    assert.equal((await post("/api/panel/auth/bot/poll")).json.state, "pending");

    const id = tgId();
    const ask = await webhook(startMsg(id, created.json.start));
    assert.equal(ask.method, "sendMessage");
    assert.match(ask.text, new RegExp(created.json.code));
    const okData = ask.reply_markup.inline_keyboard[0][0].callback_data;

    // somebody else pressing the button changes nothing
    const stranger = await webhook(press(tgId(), okData));
    assert.equal(stranger.method, "editMessageText");
    assert.match(stranger.text, /eskirgan/);
    assert.equal((await post("/api/panel/auth/bot/poll")).json.state, "pending");

    const done = await webhook(press(id, okData));
    assert.match(done.text, /tasdiqlandi/);

    // another browser can't claim it — no dt_login cookie
    const other = await browser();
    assert.equal((await other("/api/panel/auth/bot/poll")).json.state, "missing");

    const won = await post("/api/panel/auth/bot/poll");
    assert.equal(won.json.state, "approved");
    assert.equal(won.json.me.user.username, "dilnoza_flowers");
    assert.ok(won.jar.get("dt_panel"));
    assert.ok(!won.jar.has("dt_login"));
    const me = await fetch(`${BASE}/api/panel/me`, { headers: { cookie: `dt_panel=${won.jar.get("dt_panel")}` } });
    assert.equal(me.status, 200);
    // replaying the start link after approval does nothing
    assert.match((await webhook(startMsg(id, created.json.start))).text, /eskirgan/);
  });

  test("declined request stops the browser; unknown links are handled", async () => {
    const post = await browser();
    const created = await post("/api/panel/auth/bot");
    const id = tgId();
    const ask = await webhook(startMsg(id, created.json.start));
    await webhook(press(id, ask.reply_markup.inline_keyboard[0][1].callback_data));
    assert.equal((await post("/api/panel/auth/bot/poll")).json.state, "declined");
    assert.match((await webhook(startMsg(id, "login_" + "x".repeat(22)))).text, /eskirgan/);
    const csrf = await fetch(`${BASE}/api/panel/auth/bot`, { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: "{}" });
    assert.equal(csrf.status, 403);
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

  test("creates the studio, makes the user owner, writes audit, starts the 30-day free month", async () => {
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
    assert.ok(st[0].days >= 29 && st[0].days <= 31);
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

describe("orders & payments", () => {
  const owner = new Client();
  const manager = new Client();
  const stranger = new Client();
  let studioId = "";
  let orderId = "";
  let paymentId = "";
  const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
  const plus = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400e3).toISOString().slice(0, 10);
  const day = plus(20);
  const order = (over: Record<string, unknown> = {}) => ({ clientName: "Laziz Ergashev", clientPhone: "97 214 60 05", eventDate: day, eventType: "toy", venue: "Bahor", guests: 120, total: 9_000_000, ...over });

  before(async () => {
    await owner.devLogin(tgId(), "Owner");
    studioId = (await owner.req("/api/panel/onboarding", { body: { name: "Orders Studio", category: "dekor", dailyCapacity: 1 } })).json.studio.id;
    const m = (await manager.devLogin(tgId(), "Sardor")).json.user;
    await pool.query("insert into studio_members (studio_id, user_id, role) values ($1, $2, 'manager')", [studioId, m.id]);
    await stranger.devLogin(tgId(), "Stranger");
    await stranger.req("/api/panel/onboarding", { body: { name: "Else", category: "dekor", dailyCapacity: 3 } });
  });

  test("create with advance: phone normalised, advance becomes the first payment, audit written", async () => {
    const r = await owner.req("/api/panel/orders", { body: order({ advance: { amount: 6_000_000, method: "cash" } }) });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    orderId = r.json.order.id;
    assert.match(r.json.order.code, /^DS-\d{6}$/);
    assert.equal(r.json.order.phone, "+998972146005");
    assert.equal(r.json.order.paid, 6_000_000);
    assert.equal(r.json.order.balance, 3_000_000);
    assert.deepEqual(r.json.warnings, []);
    const { rows } = await pool.query("select action from studio_events where entity = 'order' and entity_id = $1", [orderId]);
    assert.deepEqual(rows.map((x) => x.action), ["create"]);
  });

  test("validation: advance > total, bad phone, unknown event type — field errors in Uzbek", async () => {
    const r = await owner.req("/api/panel/orders", { body: order({ clientPhone: "123", eventType: "x", advance: { amount: 10_000_000 } }) });
    assert.equal(r.status, 422);
    assert.ok(r.json.error.fields.clientPhone && r.json.error.fields.eventType);
    const adv = await owner.req("/api/panel/orders", { body: order({ advance: { amount: 10_000_000 } }) });
    assert.equal(adv.json.error.fields["advance.amount"], "Avans summadan oshmasin");
  });

  test("capacity is a warning, not a block (capacity 1 → second order warns)", async () => {
    const r = await manager.req("/api/panel/orders", { body: order({ clientName: "Ikkinchi", total: 1_000_000 }) });
    assert.equal(r.status, 201);
    assert.deepEqual(r.json.warnings, ["capacity_exceeded"]);
    await manager.req(`/api/panel/orders/${r.json.order.id}/status`, { body: { to: "cancelled" } });
  });

  test("payments: add, overpay warns, manager can undo own fresh payment but not others'", async () => {
    const p = await manager.req(`/api/panel/orders/${orderId}/payments`, { body: { amount: 2_000_000, method: "card" } });
    assert.equal(p.status, 201);
    assert.equal(p.json.order.balance, 1_000_000);
    paymentId = p.json.order.payments.at(-1).id;
    const over = await owner.req(`/api/panel/orders/${orderId}/payments`, { body: { amount: 1_500_000, method: "cash" } });
    assert.deepEqual(over.json.warnings, ["overpaid"]);
    assert.equal(over.json.order.balance, -500_000);
    const ownerPayment = over.json.order.payments.at(-1).id;
    assert.equal((await manager.req(`/api/panel/payments/${ownerPayment}`, { method: "DELETE", body: {} })).status, 403);
    const undo = await manager.req(`/api/panel/payments/${paymentId}`, { method: "DELETE", body: {} });
    assert.equal(undo.status, 200);
    assert.equal(undo.json.order.balance, 1_500_000); // 9M − (6M advance + 1.5M owner)
    // owner removes the overpayment; soft-deleted rows stay in the table
    const del = await owner.req(`/api/panel/payments/${ownerPayment}`, { method: "DELETE", body: {} });
    assert.equal(del.json.order.balance, 3_000_000);
    const { rows } = await pool.query("select count(*)::int as n from order_payments where order_id = $1 and deleted_at is not null", [orderId]);
    assert.equal(rows[0].n, 2);
    assert.equal((await owner.req(`/api/panel/payments/${ownerPayment}`, { method: "DELETE", body: {} })).status, 404);
  });

  test("future-dated payment is rejected; cancelled orders take no payments", async () => {
    const f = await owner.req(`/api/panel/orders/${orderId}/payments`, { body: { amount: 1000, method: "cash", paidOn: plus(3) } });
    assert.equal(f.status, 422);
  });

  test("edit writes a field diff; no-op edit writes nothing", async () => {
    const r = await owner.req(`/api/panel/orders/${orderId}`, { method: "PATCH", body: { venue: "Navroʻz", guests: 150 } });
    assert.equal(r.json.order.venue, "Navroʻz");
    await owner.req(`/api/panel/orders/${orderId}`, { method: "PATCH", body: { venue: "Navroʻz" } });
    const { rows } = await pool.query("select diff from studio_events where entity = 'order' and entity_id = $1 and action = 'update'", [orderId]);
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0].diff.venue, ["Bahor", "Navroʻz"]);
  });

  test("status machine: active → done → active, cancelled → done is refused", async () => {
    assert.equal((await owner.req(`/api/panel/orders/${orderId}/status`, { body: { to: "done" } })).json.order.status, "done");
    assert.equal((await owner.req(`/api/panel/orders/${orderId}/status`, { body: { to: "active" } })).json.order.status, "active");
    await owner.req(`/api/panel/orders/${orderId}/status`, { body: { to: "cancelled" } });
    const bad = await owner.req(`/api/panel/orders/${orderId}/status`, { body: { to: "done" } });
    assert.equal(bad.status, 409);
    const pay = await owner.req(`/api/panel/orders/${orderId}/payments`, { body: { amount: 1000, method: "cash" } });
    assert.equal(pay.status, 409);
    await owner.req(`/api/panel/orders/${orderId}/status`, { body: { to: "active" } });
  });

  test("list views, counts, search by name and phone digits", async () => {
    const up = await owner.req("/api/panel/orders?view=upcoming");
    assert.equal(up.status, 200);
    assert.ok(up.json.items.some((o: { id: string }) => o.id === orderId));
    assert.ok(up.json.counts.debt >= 1 && up.json.counts.cancelled >= 1);
    const debt = await owner.req("/api/panel/orders?view=debt");
    assert.ok(debt.json.items.every((o: { balance: number }) => o.balance > 0));
    assert.equal((await owner.req("/api/panel/orders?view=upcoming&q=laziz")).json.items.length, 1);
    assert.equal((await owner.req("/api/panel/orders?view=upcoming&q=214 60")).json.items.length, 1);
    assert.equal((await owner.req("/api/panel/orders?view=upcoming&q=%25")).json.items.length, 0); // % is literal
    assert.equal((await owner.req("/api/panel/orders?view=nope")).status, 422);
  });

  test("list: page size, month filter and month menu", async () => {
    const all = await owner.req("/api/panel/orders?view=upcoming&per=20");
    assert.equal(all.json.pageSize, 20);
    assert.equal((await owner.req("/api/panel/orders?view=upcoming&per=7")).status, 422);
    assert.equal((await owner.req("/api/panel/orders?view=upcoming&month=2026-13")).status, 422);
    const ym = all.json.items[0].date.slice(0, 7) as string;
    const menu = all.json.months as { ym: string; count: number }[];
    assert.ok(menu.some((m) => m.ym === ym && m.count >= 1));
    const one = await owner.req(`/api/panel/orders?view=upcoming&month=${ym}`);
    assert.equal(one.json.month, ym);
    assert.ok(one.json.items.length >= 1 && one.json.items.every((o: { date: string }) => o.date.startsWith(ym)));
    assert.equal(one.json.counts.upcoming, menu.find((m) => m.ym === ym)!.count);
    assert.equal((await owner.req("/api/panel/orders?view=upcoming&month=2001-01")).json.items.length, 0);
  });

  test("history lists order + payment events with actor names", async () => {
    const h = await owner.req(`/api/panel/orders/${orderId}/events`);
    const kinds = h.json.events.map((e: { entity: string; action: string }) => `${e.entity}:${e.action}`);
    assert.ok(kinds.includes("order:create") && kinds.includes("payment:create") && kinds.includes("payment:delete") && kinds.includes("order:status"));
    assert.ok(h.json.events.some((e: { actor: string }) => e.actor === "Sardor"));
  });

  test("tenancy: a stranger gets 404 everywhere", async () => {
    assert.equal((await stranger.req(`/api/panel/orders/${orderId}`)).status, 404);
    assert.equal((await stranger.req(`/api/panel/orders/${orderId}`, { method: "PATCH", body: { venue: "x" } })).status, 404);
    assert.equal((await stranger.req(`/api/panel/orders/${orderId}/payments`, { body: { amount: 1, method: "cash" } })).status, 404);
    assert.equal((await stranger.req(`/api/panel/orders/${orderId}/status`, { body: { to: "cancelled" } })).status, 404);
    assert.equal((await stranger.req(`/api/panel/orders/${orderId}/events`)).status, 404);
    assert.equal((await stranger.req(`/api/panel/orders/not-a-uuid`)).status, 404);
    assert.equal((await stranger.req("/api/panel/orders?view=upcoming&q=laziz")).json.items.length, 0);
  });
});

describe("dashboard", () => {
  const owner = new Client();
  const manager = new Client();
  let studioId = "";
  const today = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
  const plus = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86_400e3).toISOString().slice(0, 10);

  before(async () => {
    await owner.devLogin(tgId(), "Dash");
    studioId = (await owner.req("/api/panel/onboarding", { body: { name: "Dash Studio", category: "dekor", dailyCapacity: 3 } })).json.studio.id;
    const m = (await manager.devLogin(tgId(), "Mgr")).json.user;
    await pool.query("insert into studio_members (studio_id, user_id, role) values ($1, $2, 'manager')", [studioId, m.id]);
  });

  test("empty studio: zeros and setup checklist", async () => {
    const r = await owner.req("/api/panel/dashboard");
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.month.paid, 0);
    assert.equal(r.json.month.deltaPct, null);
    assert.equal(r.json.debt.total, 0);
    assert.deepEqual(r.json.setup, { hasOrders: false, hasBlockedDay: false, hasTeam: true });
    assert.equal(r.json.revenue.months.length, 12);
    assert.equal(r.json.newOrders.count, 0);
    assert.equal(r.json.next30.every((d: { load: number; blocked: boolean }) => d.load === 0 && !d.blocked), true);
  });

  test("numbers reconcile with orders and payments", async () => {
    const mk = async (date: string, total: number, advance?: number) =>
      (await owner.req("/api/panel/orders", { body: { clientName: "Mijoz " + date, clientPhone: "901234567", eventDate: date, eventType: "toy", total, ...(advance ? { advance: { amount: advance } } : {}) } })).json.order;
    const a = await mk(plus(2), 10_000_000, 4_000_000); // due 6M, in next 7
    await mk(plus(20), 5_000_000); // due 5M, in next 30
    const old = await mk(plus(-3), 3_000_000, 1_000_000); // overdue 2M
    const paidUp = await mk(plus(1), 2_000_000, 2_000_000); // paid in full
    const cancelled = await mk(plus(4), 7_000_000, 1_000_000);
    await owner.req(`/api/panel/orders/${cancelled.id}/status`, { body: { to: "cancelled" } });
    // a deleted payment never counts
    const pay = await owner.req(`/api/panel/orders/${a.id}/payments`, { body: { amount: 500_000, method: "card" } });
    await owner.req(`/api/panel/payments/${pay.json.order.payments.at(-1).id}`, { method: "DELETE", body: {} });

    const r = (await owner.req("/api/panel/dashboard")).json;
    assert.equal(r.month.paid, 4_000_000 + 1_000_000 + 2_000_000 + 1_000_000); // advances paid today, cancelled order's money was still received
    assert.equal(r.debt.total, 6_000_000 + 5_000_000 + 2_000_000);
    assert.equal(r.debt.count, 3);
    assert.equal(r.debt.overdue.count, 1);
    assert.equal(r.debt.overdue.total, 2_000_000);
    assert.deepEqual(r.debt.overdue.items.map((o: { id: string }) => o.id), [old.id]);
    assert.deepEqual(r.debt.week, { count: 1, total: 6_000_000 }); // only `a` is due within 7 days
    // Keyingi 30 kun strip: one cell per day, loads from active orders only (cancelled doesn't count)
    assert.equal(r.next30.length, 30);
    assert.equal(r.next30[0].date, today);
    assert.equal(r.next30.find((d: { date: string }) => d.date === plus(2)).load, 1);
    assert.equal(r.next30.find((d: { date: string }) => d.date === plus(4)).load, 0);
    // Yangi buyurtmalar: everything was created today; cancelled is excluded, 3 of 4 paid an advance
    assert.equal(r.newOrders.count, 4);
    assert.equal(r.newOrders.advanced, 3);
    assert.equal(r.newOrders.advancedSum, 4_000_000 + 1_000_000 + 2_000_000);
    assert.equal(r.debt.items[0].id, old.id); // overdue first
    assert.deepEqual(r.next7.map((o: { id: string }) => o.id), [paidUp.id, a.id]);
    assert.equal(r.next30Count, 3);
    assert.equal(r.revenue.months.at(-1).paid, r.month.paid);
    assert.equal(r.setup.hasOrders, true);
  });

  test("managers and strangers don't see money", async () => {
    assert.equal((await manager.req("/api/panel/dashboard")).status, 403);
    const s = new Client();
    await s.devLogin(tgId());
    assert.equal((await s.req("/api/panel/dashboard", { headers: { "x-studio-id": studioId } })).status, 404);
  });
});

describe("settings & team", () => {
  const owner = new Client();
  const joiner = new Client();
  const other = new Client();
  let studioId = "";
  const tokenOf = (link: string) => /(?:inv_|[?&]t=)([A-Za-z0-9_-]+)/.exec(link)![1];

  before(async () => {
    await owner.devLogin(tgId(), "Sardor");
    studioId = (await owner.req("/api/panel/onboarding", { body: { name: "Team Studio", category: "dekor", dailyCapacity: 3 } })).json.studio.id;
    await joiner.devLogin(tgId(), "Madina");
    await other.devLogin(tgId(), "Begona");
  });

  test("owner edits the studio; audit keeps old → new; validation per field", async () => {
    const r = await owner.req("/api/panel/studio", { method: "PATCH", body: { name: "Studio Gulzor", dailyCapacity: 4 } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.studio.name, "Studio Gulzor");
    assert.equal(r.json.studio.dailyCapacity, 4);
    const bad = await owner.req("/api/panel/studio", { method: "PATCH", body: { dailyCapacity: 50 } });
    assert.equal(bad.status, 422);
    const { rows } = await pool.query("select diff from studio_events where studio_id = $1 and entity = 'studio' and action = 'update'", [studioId]);
    assert.deepEqual(rows[0].diff.name, ["Team Studio", "Studio Gulzor"]);
  });

  test("invite: preview → accept (one-time) → joiner is a manager of the right studio", async () => {
    const inv = await owner.req("/api/panel/invites", { body: {} });
    assert.equal(inv.status, 201);
    const token = tokenOf(inv.json.link);
    const { rows } = await pool.query("select token_hash from studio_invites where id = $1", [inv.json.id]);
    assert.notEqual(rows[0].token_hash, token); // only the hash is stored

    const pre = await joiner.req(`/api/panel/invites/preview?t=${token}`);
    assert.deepEqual([pre.json.studio.name, pre.json.inviter, pre.json.status], ["Studio Gulzor", "Sardor", "ok"]);

    const acc = await joiner.req("/api/panel/invites/accept", { body: { token } });
    assert.equal(acc.status, 200, JSON.stringify(acc.json));
    assert.equal(acc.json.joined, true);
    assert.deepEqual(acc.json.studios.map((s: { id: string; role: string }) => [s.id, s.role]), [[studioId, "manager"]]);

    // again by the same person: idempotent; by someone else: gone
    assert.equal((await joiner.req("/api/panel/invites/accept", { body: { token } })).json.joined, false);
    const reuse = await other.req("/api/panel/invites/accept", { body: { token } });
    assert.equal(reuse.status, 410);
    assert.equal(reuse.json.error.code, "invite_used");
    assert.equal((await other.req(`/api/panel/invites/preview?t=${token}`)).json.status, "used");
    assert.equal((await other.req(`/api/panel/invites/preview?t=junk`)).status, 404);
  });

  test("expired and revoked invites are refused", async () => {
    const a = await owner.req("/api/panel/invites", { body: {} });
    await pool.query("update studio_invites set expires_at = now() - interval '1 minute' where id = $1", [a.json.id]);
    assert.equal((await other.req("/api/panel/invites/accept", { body: { token: tokenOf(a.json.link) } })).json.error.code, "invite_expired");
    const b = await owner.req("/api/panel/invites", { body: {} });
    const listed = await owner.req("/api/panel/invites");
    assert.ok(listed.json.invites.some((i: { id: string }) => i.id === b.json.id));
    await owner.req(`/api/panel/invites/${b.json.id}`, { method: "DELETE", body: {} });
    assert.equal((await other.req("/api/panel/invites/accept", { body: { token: tokenOf(b.json.link) } })).status, 410);
  });

  test("roles: a manager can't invite, list or remove members, or edit the studio", async () => {
    assert.equal((await joiner.req("/api/panel/invites", { body: {} })).status, 403);
    assert.equal((await joiner.req("/api/panel/members")).status, 403);
    assert.equal((await joiner.req("/api/panel/studio", { method: "PATCH", body: { name: "Hack" } })).status, 403);
  });

  test("members: list with roles; owner can't remove self; removing a manager revokes access", async () => {
    const m = await owner.req("/api/panel/members");
    assert.deepEqual(m.json.members.map((x: { role: string; isYou: boolean }) => [x.role, x.isYou]), [["owner", true], ["manager", false]]);
    const ownerId = m.json.members[0].userId;
    const mgrId = m.json.members[1].userId;
    assert.equal((await owner.req(`/api/panel/members/${ownerId}`, { method: "DELETE", body: {} })).status, 409);
    const r = await owner.req(`/api/panel/members/${mgrId}`, { method: "DELETE", body: {} });
    assert.equal(r.json.members.length, 1);
    assert.equal((await joiner.req("/api/panel/calendar?month=2026-11", { headers: { "x-studio-id": studioId } })).status, 404);
    // the removed person learns why ("Kirish yopilgan"), with the owner to ask
    const me = await joiner.req("/api/panel/me");
    assert.equal(me.json.studios.length, 0);
    assert.equal(me.json.removed.studio, (await owner.req("/api/panel/me")).json.studios[0].name);
    assert.ok(me.json.removed.by.name);
    // owners and people with a studio never get the flag
    assert.equal((await owner.req("/api/panel/me")).json.removed, null);
  });

  test("each member toggles their own reminder; the cron respects it", async () => {
    const r = await owner.req("/api/panel/members/me", { method: "PATCH", body: { remindersOn: false } });
    assert.deepEqual(r.json, { remindersOn: false });
    const me = await owner.req("/api/panel/me");
    assert.equal(me.json.studios[0].remindersOn, false);
    await owner.req("/api/panel/members/me", { method: "PATCH", body: { remindersOn: true } });
  });

  test("a person in two studios switches with x-studio-id", async () => {
    const two = new Client();
    await two.devLogin(tgId(), "Ikki");
    const own = (await two.req("/api/panel/onboarding", { body: { name: "Own", category: "floristika", dailyCapacity: 2 } })).json.studio.id;
    const inv = await owner.req("/api/panel/invites", { body: {} });
    await two.req("/api/panel/invites/accept", { body: { token: tokenOf(inv.json.link) } });
    assert.equal((await two.req("/api/panel/studio", { headers: { "x-studio-id": own } })).json.role, "owner");
    assert.equal((await two.req("/api/panel/studio", { headers: { "x-studio-id": studioId } })).json.role, "manager");
    assert.equal((await two.req("/api/panel/dashboard", { headers: { "x-studio-id": studioId } })).status, 403);
  });
});

describe("finished events keep their day", () => {
  const owner = new Client();
  before(async () => {
    await owner.devLogin(tgId(), "Done");
    await owner.req("/api/panel/onboarding", { body: { name: "Done Studio", category: "dekor", dailyCapacity: 1 } });
  });

  test("a done order stays on the calendar, still fills capacity; cancelling frees the day", async () => {
    const date = "2026-12-12";
    const o = (await owner.req("/api/panel/orders", { body: { clientName: "Bajarildi", clientPhone: "901234567", eventDate: date, eventType: "toy", total: 1_000_000 } })).json.order;
    await owner.req(`/api/panel/orders/${o.id}/status`, { body: { to: "done" } });
    const day = async () => (await owner.req("/api/panel/calendar?month=2026-12")).json.days.find((d: { date: string }) => d.date === date);
    assert.equal((await day()).status, "booked");
    assert.deepEqual((await day()).orders.map((x: { client: string }) => x.client), ["Bajarildi"]);
    const second = await owner.req("/api/panel/orders", { body: { clientName: "Ikkinchi", clientPhone: "901234567", eventDate: date, eventType: "toy", total: 1_000_000 } });
    assert.ok(second.json.warnings.includes("capacity_exceeded"));
    await owner.req(`/api/panel/orders/${second.json.order.id}/status`, { body: { to: "cancelled" } });
    await owner.req(`/api/panel/orders/${o.id}/status`, { body: { to: "active" } });
    await owner.req(`/api/panel/orders/${o.id}/status`, { body: { to: "cancelled" } });
    assert.equal((await day())?.status ?? "free", "free");
  });
});

/* Phase 7 audit: every /api/panel endpoint × {anonymous, outsider, manager} — one table, so a new route can't ship unguarded */
describe("authorization matrix", () => {
  const a = new Client(); // owner of A
  const m = new Client(); // manager of A
  const b = new Client(); // owner of B (outsider to A)
  let A = "";
  let B = "";
  let order = "";
  let payment = "";
  let invite = "";
  let managerId = "";

  before(async () => {
    const studio = async (c: Client, name: string) => {
      await c.devLogin(tgId(), name);
      const r = await c.req("/api/panel/onboarding", { body: { name: `${name} Studio`, category: "dekor", dailyCapacity: 2 } });
      assert.equal(r.status, 201, JSON.stringify(r.json));
      return r.json.studio.id as string;
    };
    A = await studio(a, "Ali");
    B = await studio(b, "Bek");
    const o = await a.req("/api/panel/orders", { body: { clientName: "Matrix", clientPhone: "901234567", eventDate: "2026-12-20", eventType: "toy", total: 5_000_000, advance: { amount: 1_000_000 } } });
    order = o.json.order.id;
    payment = (await a.req(`/api/panel/orders/${order}`)).json.order.payments[0].id;
    const inv = await a.req("/api/panel/invites", { body: {} });
    await m.devLogin(tgId(), "Mena");
    await m.req("/api/panel/invites/accept", { body: { token: /(?:inv_|[?&]t=)([A-Za-z0-9_-]+)/.exec(inv.json.link)![1] } });
    invite = (await a.req("/api/panel/invites", { body: {} })).json.id;
    managerId = (await a.req("/api/panel/members")).json.members.find((x: { role: string }) => x.role === "manager").userId;
  });

  type Call = { name: string; method: string; path: () => string; body?: unknown; owner?: boolean };
  const calls: Call[] = [
    { name: "calendar", method: "GET", path: () => "/api/panel/calendar?month=2026-12" },
    { name: "day", method: "PUT", path: () => "/api/panel/days/2026-12-21", body: { blocked: true, reason: "dam" } },
    { name: "summary", method: "GET", path: () => "/api/panel/summary" },
    { name: "orders list", method: "GET", path: () => "/api/panel/orders" },
    { name: "order", method: "GET", path: () => `/api/panel/orders/${order}` },
    { name: "order edit", method: "PATCH", path: () => `/api/panel/orders/${order}`, body: { venue: "X" } },
    { name: "order status", method: "POST", path: () => `/api/panel/orders/${order}/status`, body: { to: "done" } },
    { name: "order events", method: "GET", path: () => `/api/panel/orders/${order}/events` },
    { name: "payment add", method: "POST", path: () => `/api/panel/orders/${order}/payments`, body: { amount: 1000, method: "cash" } },
    { name: "payment delete", method: "DELETE", path: () => `/api/panel/payments/${payment}`, body: {} },
    { name: "studio", method: "GET", path: () => "/api/panel/studio" },
    { name: "my reminders", method: "PATCH", path: () => "/api/panel/members/me", body: { remindersOn: true } },
    { name: "dashboard", method: "GET", path: () => "/api/panel/dashboard", owner: true },
    { name: "studio edit", method: "PATCH", path: () => "/api/panel/studio", body: { name: "Hack" }, owner: true },
    { name: "members", method: "GET", path: () => "/api/panel/members", owner: true },
    { name: "member remove", method: "DELETE", path: () => `/api/panel/members/${managerId}`, body: {}, owner: true },
    { name: "invites", method: "GET", path: () => "/api/panel/invites", owner: true },
    { name: "invite create", method: "POST", path: () => "/api/panel/invites", body: {}, owner: true },
    { name: "invite revoke", method: "DELETE", path: () => `/api/panel/invites/${invite}`, body: {}, owner: true },
  ];

  test("anonymous → 401 everywhere", async () => {
    const anon = new Client();
    for (const c of calls) assert.equal((await anon.req(c.path(), { method: c.method, body: c.body })).status, 401, c.name);
    for (const p of ["/api/panel/me", "/api/panel/invites/preview?t=x"]) assert.equal((await anon.req(p)).status, 401, p);
  });

  test("outsider naming studio A → 404 (A's existence isn't confirmed)", async () => {
    for (const c of calls) assert.equal((await b.req(c.path(), { method: c.method, body: c.body, headers: { "x-studio-id": A } })).status, 404, c.name);
  });

  test("outsider inside their own studio can't reach A's records by id", async () => {
    const h = { "x-studio-id": B };
    for (const c of calls.filter((c) => /order |order$|payment|events|invite revoke|member remove/.test(c.name)))
      assert.equal((await b.req(c.path(), { method: c.method, body: c.body, headers: h })).status, 404, c.name);
    const { rows } = await pool.query("select venue, status from orders where id = $1", [order]);
    assert.deepEqual(rows[0], { venue: null, status: "active" });
  });

  test("manager → 403 on owner-only, allowed elsewhere", async () => {
    for (const c of calls.filter((c) => c.owner)) assert.equal((await m.req(c.path(), { method: c.method, body: c.body })).status, 403, c.name);
    for (const c of calls.filter((c) => !c.owner && c.method === "GET")) assert.equal((await m.req(c.path())).status, 200, c.name);
  });

  test("mutations need JSON from our own origin", async () => {
    const plain = await fetch(`${BASE}/api/panel/orders/${order}/payments`, { method: "POST", headers: { cookie: a.cookie, "content-type": "text/plain", origin: BASE }, body: JSON.stringify({ amount: 1000, method: "cash" }) });
    assert.ok([403, 415].includes(plain.status), String(plain.status));
    const foreign = await a.req(`/api/panel/orders/${order}/payments`, { body: { amount: 1000, method: "cash" }, origin: "https://evil.example" });
    assert.equal(foreign.status, 403);
    const { rows } = await pool.query("select count(*)::int as n from order_payments where order_id = $1", [order]);
    assert.equal(rows[0].n, 1);
  });
});

/* Forward → buyurtma. Server env also needs TELEGRAM_API_BASE=http://127.0.0.1:3199 (the mock Bot API below). */
describe("forward → buyurtma", () => {
  const hookSecret = createHmac("sha256", PANEL_TEST_BOT_TOKEN).update("floreal-webhook-v1").digest("hex");
  const webhook = (update: object) =>
    fetch(`${BASE}/api/telegram/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": hookSecret },
      body: JSON.stringify({ update_id: 1, ...update }),
    }).then((r) => r.json());
  const fwd = (from: number, text: string, client = "Dilnoza Karimova") => ({
    message: { message_id: 1, chat: { id: from, type: "private" }, from: { id: from, first_name: "Owner" }, text, forward_origin: { type: "hidden_user", date: 0, sender_user_name: client } },
  });
  const typed = (from: number, text: string) => ({ message: { message_id: 1, chat: { id: from, type: "private" }, from: { id: from, first_name: "Owner" }, text } });

  const calls: { method: string; body: Record<string, unknown> }[] = [];
  let nextId = 100;
  let mock: import("node:http").Server;
  const owner = new Client();
  const ownerTg = tgId();

  before(async () => {
    const http = await import("node:http");
    mock = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        const method = req.url!.split("/").pop()!;
        calls.push({ method, body: JSON.parse(raw || "{}") });
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true, result: method === "sendMessage" ? { message_id: nextId++ } : true }));
      });
    });
    await new Promise<void>((r) => mock.listen(3199, "127.0.0.1", r));
    await owner.devLogin(ownerTg, "Owner");
    await owner.req("/api/panel/onboarding", { body: { name: "Forward Decor", category: "dekor", dailyCapacity: 3 } });
  });
  after(() => new Promise<void>((r) => mock.close(() => r())));

  const drafts = async (tg: number) => (await pool.query("select * from order_drafts where tg_user_id = $1 order by created_at", [tg])).rows;

  test("a stranger's forward gets the help text and stores nothing", async () => {
    const stranger = tgId();
    const r = await webhook(fwd(stranger, "14-dekabr to'y, 90 123 45 67"));
    assert.equal(r.method, "sendMessage");
    assert.match(r.text, /Buyruqlar/);
    assert.equal((await drafts(stranger)).length, 0);
  });

  test("typed small talk from a member is not a draft", async () => {
    const r = await webhook(typed(ownerTg, "rahmat"));
    assert.match(r.text, /Buyruqlar/);
  });

  let draftId = "";
  test("consecutive forwards fold into one draft and one bot card (parallel-safe)", async () => {
    calls.length = 0;
    assert.deepEqual(await webhook(fwd(ownerTg, "Assalomu alaykum! Qizimning to'yi 14-dekabr, Navro'z to'yxonasida")), { ok: true });
    await Promise.all([webhook(fwd(ownerTg, "200 kishi, byudjet 12 mln")), webhook(fwd(ownerTg, "avans 3 mln tashlayman. 90 123 45 67"))]);
    const rows = await drafts(ownerTg);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].parts, 3);
    assert.deepEqual(rows[0].parsed, {
      clientName: "Dilnoza Karimova",
      clientPhone: "+998901234567",
      eventDate: rows[0].parsed.eventDate,
      eventType: "toy",
      venue: "Navro'z to'yxonasi",
      guests: 200,
      total: 12_000_000,
      advance: 3_000_000,
    });
    assert.match(rows[0].parsed.eventDate, /^\d{4}-12-14$/);
    assert.deepEqual(calls.map((c) => c.method), ["sendMessage", "editMessageText", "editMessageText"]);
    assert.ok(calls.slice(1).every((c) => c.body.message_id === rows[0].bot_message_id));
    assert.match(String(calls[2].body.text), /3 ta xabardan/);
    draftId = rows[0].id;
  });

  test("another client's chat starts a new draft", async () => {
    await webhook(fwd(ownerTg, "salom 12.12 korporativ", "Jasur"));
    const rows = await drafts(ownerTg);
    assert.equal(rows.length, 2);
    await pool.query("delete from order_drafts where id = $1", [rows[1].id]);
  });

  test("only the author can read the draft", async () => {
    const r = await owner.req(`/api/panel/drafts/${draftId}`);
    assert.equal(r.status, 200);
    assert.equal(r.json.draft.parsed.total, 12_000_000);
    const other = new Client();
    await other.devLogin(tgId());
    assert.equal((await other.req(`/api/panel/drafts/${draftId}`)).status, 404);
    assert.equal((await owner.req("/api/panel/drafts/%27%3Bdrop")).status, 404);
  });

  test("saving the order consumes the draft, wipes the chat and closes the bot card", async () => {
    calls.length = 0;
    const d = (await owner.req(`/api/panel/drafts/${draftId}`)).json.draft.parsed;
    const r = await owner.req("/api/panel/orders", {
      body: { clientName: d.clientName, clientPhone: d.clientPhone, eventDate: d.eventDate, eventType: d.eventType, venue: d.venue, guests: d.guests, total: d.total, advance: { amount: d.advance, method: "cash" }, draftId },
    });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const [row] = await drafts(ownerTg);
    assert.ok(row.consumed_at);
    assert.equal(row.text, null);
    assert.equal(row.order_id, r.json.order.id);
    const { rows: ev } = await pool.query("select diff->>'source' as source from studio_events where entity_id = $1 and action = 'create'", [r.json.order.id]);
    assert.equal(ev[0].source, "telegram");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "editMessageText");
    assert.match(String(calls[0].body.text), /Buyurtma saqlandi/);
    assert.deepEqual(calls[0].body.reply_markup, { inline_keyboard: [] });
    assert.equal((await owner.req(`/api/panel/drafts/${draftId}`)).status, 404);
  });
});

describe("smeta & qoldiq eslatmasi", () => {
  const owner = new Client();
  const ownerTg = tgId();
  let orderId = "";
  const calls: { method: string; type: string; size: number }[] = [];
  let mock: import("node:http").Server;

  before(async () => {
    const http = await import("node:http");
    mock = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        calls.push({ method: req.url!.split("/").pop()!, type: String(req.headers["content-type"]), size: Buffer.concat(chunks).length });
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true, result: { message_id: 1 } }));
      });
    });
    await new Promise<void>((r) => mock.listen(3199, "127.0.0.1", r));
    await owner.devLogin(ownerTg, "Owner");
    await owner.req("/api/panel/onboarding", { body: { name: "Smeta Decor", category: "dekor", dailyCapacity: 3 } });
    const o = await owner.req("/api/panel/orders", {
      body: { clientName: "Камола Юсупова", clientPhone: "+998935551234", eventDate: "2027-01-05", eventType: "tugilgan-kun", venue: "Ресторан Caravan", total: 4_500_000, notes: "Шары, арка", advance: { amount: 1_000_000, method: "card" } },
    });
    orderId = o.json.order.id;
  });
  after(() => new Promise<void>((r) => mock.close(() => r())));

  test("GET returns a one-page PDF in either language; strangers get 404", async () => {
    for (const lang of ["uz", "ru"]) {
      const r = await fetch(`${BASE}/api/panel/orders/${orderId}/smeta?lang=${lang}`, { headers: { cookie: owner.cookie } });
      assert.equal(r.status, 200);
      assert.equal(r.headers.get("content-type"), "application/pdf");
      assert.match(r.headers.get("content-disposition") ?? "", /attachment; filename="Smeta-DS-\d+\.pdf"/);
      const buf = Buffer.from(await r.arrayBuffer());
      assert.equal(buf.subarray(0, 5).toString(), "%PDF-");
      assert.ok(buf.length < 80_000, `pdf is ${buf.length} bytes`);
    }
    const other = new Client();
    await other.devLogin(tgId());
    await other.req("/api/panel/onboarding", { body: { name: "Other", category: "dekor", dailyCapacity: 1 } });
    const peek = await fetch(`${BASE}/api/panel/orders/${orderId}/smeta`, { headers: { cookie: other.cookie } });
    assert.equal(peek.status, 404);
  });

  test("POST sends the PDF to the member's own chat via sendDocument and logs it", async () => {
    calls.length = 0;
    const r = await owner.req(`/api/panel/orders/${orderId}/smeta`, { body: { lang: "ru" } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, "sendDocument");
    assert.match(calls[0].type, /^multipart\/form-data/);
    const { rows } = await pool.query("select diff from studio_events where entity_id = $1 and action = 'smeta'", [orderId]);
    assert.deepEqual(rows[0].diff, { lang: "ru", channel: "telegram" });
  });

  test("remind records channel + balance and surfaces as lastReminder", async () => {
    assert.equal((await owner.req(`/api/panel/orders/${orderId}`)).json.order.lastReminder, null);
    const bad = await owner.req(`/api/panel/orders/${orderId}/remind`, { body: { channel: "pigeon" } });
    assert.equal(bad.status, 422);
    const r = await owner.req(`/api/panel/orders/${orderId}/remind`, { body: { channel: "sms", lang: "ru" } });
    assert.equal(r.status, 200);
    assert.equal(r.json.lastReminder.channel, "sms");
    const o = (await owner.req(`/api/panel/orders/${orderId}`)).json.order;
    assert.equal(o.lastReminder.channel, "sms");
    assert.equal(o.lastReminder.by, "Owner");
    const { rows } = await pool.query("select diff from studio_events where entity_id = $1 and action = 'remind'", [orderId]);
    assert.deepEqual(rows[0].diff, { channel: "sms", lang: "ru", balance: 3_500_000 });
    const csrf = await owner.req(`/api/panel/orders/${orderId}/remind`, { body: { channel: "sms" }, origin: "https://evil.example" });
    assert.equal(csrf.status, 403);
  });
});

describe("invite through the bot link — invitee already owns a studio", () => {
  const hookSecret = createHmac("sha256", PANEL_TEST_BOT_TOKEN).update("floreal-webhook-v1").digest("hex");
  const startText = (from: number, text: string) =>
    fetch(`${BASE}/api/telegram/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-telegram-bot-api-secret-token": hookSecret },
      body: JSON.stringify({ update_id: 1, message: { message_id: 1, chat: { id: from, type: "private" }, from: { id: from, first_name: "Odil" }, text } }),
    }).then((r) => r.json());
  const owner = new Client();
  const multi = new Client();
  const multiTg = tgId();
  let ownerStudio = "";
  let ownStudio = "";

  before(async () => {
    await owner.devLogin(tgId(), "Ibrohim Abrolov");
    ownerStudio = (await owner.req("/api/panel/onboarding", { body: { name: "Xasanflorist", category: "floristika", dailyCapacity: 3 } })).json.studio.id;
    await multi.devLogin(multiTg, "Odil");
    ownStudio = (await multi.req("/api/panel/onboarding", { body: { name: "Odil Dekor", category: "dekor", dailyCapacity: 2 } })).json.studio.id;
  });

  test("link opens the bot chat; bot names the studio; joining keeps the own studio; roles stay per studio", async () => {
    const inv = await owner.req("/api/panel/invites", { body: {} });
    assert.equal(inv.status, 201);
    assert.match(inv.json.link, /^https:\/\/t\.me\/floreal_uz_bot\?start=inv_[A-Za-z0-9_-]{24}$/);
    const token = /inv_([A-Za-z0-9_-]+)/.exec(inv.json.link)![1];

    const ask = await startText(multiTg, `/start inv_${token}`);
    assert.match(ask.text, /<b>Xasanflorist<\/b>/);
    assert.match(ask.text, /Ibrohim sizni menejer qilib taklif qildi/);
    assert.match(ask.reply_markup.inline_keyboard[0][0].web_app.url, new RegExp(`\\?taklif=${token}$`));

    const acc = await multi.req("/api/panel/invites/accept", { body: { token } });
    assert.equal(acc.status, 200, JSON.stringify(acc.json));
    const roles = Object.fromEntries(acc.json.studios.map((s: { id: string; role: string }) => [s.id, s.role]));
    assert.deepEqual(roles, { [ownStudio]: "owner", [ownerStudio]: "manager" });

    // each request runs in the studio the header names, with that studio's role
    const as = (id: string) => ({ "x-studio-id": id });
    assert.equal((await multi.req("/api/panel/dashboard", { headers: as(ownStudio) })).status, 200);
    assert.equal((await multi.req("/api/panel/dashboard", { headers: as(ownerStudio) })).status, 403);
    assert.equal((await multi.req("/api/panel/studio", { headers: as(ownerStudio) })).json.studio.name, "Xasanflorist");
    assert.equal((await multi.req("/api/panel/studio", { headers: as(ownStudio) })).json.studio.name, "Odil Dekor");
    // manager can't touch the owner's settings
    assert.equal((await multi.req("/api/panel/studio", { method: "PATCH", headers: as(ownerStudio), body: { name: "Hack" } })).status, 403);

    // owner sees the new manager and no pending invite
    const team = await owner.req("/api/panel/members");
    assert.deepEqual(team.json.members.map((m: { name: string; role: string }) => [m.name, m.role]), [["Ibrohim Abrolov", "owner"], ["Odil", "manager"]]);
    assert.equal((await owner.req("/api/panel/invites")).json.invites.length, 0);

    // the same link again: the bot says it's used, no join button
    const again = await startText(multiTg, `/start inv_${token}`);
    assert.match(again.text, /allaqachon ishlatilgan/);
    assert.doesNotMatch(again.reply_markup.inline_keyboard[0][0].web_app.url, /taklif/);
    assert.match((await startText(multiTg, `/start inv_${"x".repeat(24)}`)).text, /notoʻgʻri/);
  });
});

describe("tez orada — Menga kerak", () => {
  test("vote is per member + studio, idempotent, validated, CSRF-protected", async () => {
    const owner = new Client();
    await owner.devLogin(tgId(), "Owner");
    const studioId = (await owner.req("/api/panel/onboarding", { body: { name: "Interest Studio", category: "dekor", dailyCapacity: 3 } })).json.studio.id;
    const manager = new Client();
    const m = (await manager.devLogin(tgId(), "Menejer")).json.user;
    await pool.query("insert into studio_members (studio_id, user_id, role) values ($1, $2, 'manager')", [studioId, m.id]);

    assert.equal((await new Client().req("/api/panel/interest")).status, 401);
    assert.deepEqual((await owner.req("/api/panel/interest")).json.features, []);
    assert.equal((await owner.req("/api/panel/interest", { body: { feature: "rekvizit" }, origin: "https://evil.example" })).status, 403);
    assert.equal((await owner.req("/api/panel/interest", { body: { feature: "kosmos" } })).status, 422);

    assert.deepEqual((await owner.req("/api/panel/interest", { body: { feature: "rekvizit" } })).json.features, ["rekvizit"]);
    assert.deepEqual((await owner.req("/api/panel/interest", { body: { feature: "rekvizit" } })).json.features, ["rekvizit"]);
    // the manager's own vote is separate
    assert.deepEqual((await manager.req("/api/panel/interest")).json.features, []);
    assert.equal((await manager.req("/api/panel/interest", { body: { feature: "xarajatlar" } })).status, 200);

    const { rows } = await pool.query("select entity_id, action, diff->>'role' as role from studio_events where studio_id = $1 and entity = 'interest' order by created_at", [studioId]);
    assert.deepEqual(rows, [
      { entity_id: "rekvizit", action: "vote", role: "owner" },
      { entity_id: "xarajatlar", action: "vote", role: "manager" },
    ]);
  });
});

describe("sozlamalar v2 — studiya egasi va jamoani tark etish", () => {
  test("manager sees the owner; leaves on their own; owner cannot leave; leave ≠ removed", async () => {
    const owner = new Client();
    await owner.devLogin(tgId(), "Ega Egamov");
    const studioId = (await owner.req("/api/panel/onboarding", { body: { name: "Leave Studio", category: "dekor", dailyCapacity: 3 } })).json.studio.id;
    const manager = new Client();
    const m = (await manager.devLogin(tgId(), "Menejer")).json.user;
    await pool.query("insert into studio_members (studio_id, user_id, role) values ($1, $2, 'manager')", [studioId, m.id]);

    const d = await manager.req("/api/panel/studio");
    assert.equal(d.status, 200);
    assert.equal(d.json.owner.name, "Ega Egamov");

    assert.equal((await owner.req("/api/panel/members/me", { method: "DELETE", body: {} })).status, 409);
    assert.equal((await manager.req("/api/panel/members/me", { method: "DELETE", body: {}, origin: "https://evil.example" })).status, 403);
    assert.equal((await manager.req("/api/panel/members/me", { method: "DELETE", body: {} })).status, 200);
    assert.equal((await manager.req("/api/panel/studio")).status, 409); // no studio left → onboarding
    const me = await manager.req("/api/panel/me");
    assert.ok(!me.json.removed, "leaving yourself must not show the 'egasi sizni chiqardi' screen");
    const team = await owner.req("/api/panel/members");
    assert.deepEqual(team.json.members.map((x: { role: string }) => x.role), ["owner"]);
    const { rows } = await pool.query("select action from studio_events where studio_id = $1 and entity = 'member'", [studioId]);
    assert.deepEqual(rows.map((r) => r.action), ["leave"]);
  });

  test("logo is a valid fake-door feature", async () => {
    const c = new Client();
    await c.devLogin(tgId(), "Logo");
    await c.req("/api/panel/onboarding", { body: { name: "Logo Studio", category: "floristika", dailyCapacity: 2 } });
    assert.deepEqual((await c.req("/api/panel/interest", { body: { feature: "logo" } })).json.features, ["logo"]);
  });
});
