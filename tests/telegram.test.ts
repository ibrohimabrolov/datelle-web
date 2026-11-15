import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { verifyInitData, verifyLoginWidget, verifySecret } from "../src/server/telegram/signature";
import { formatSum, parseCommand, parseInvite, reminderMessage, reminderText, replyTo, shortDate, type TgUpdate } from "../src/server/telegram/messages";
import { botConfig } from "../src/server/telegram/config";
import { fanOutReminders, type StudioDigest } from "../src/server/telegram/reminders";

const TOKEN = "123456:TEST-token_abcdefghijklmnopqrstuvwxyz";
const NOW = 1_763_100_000; // fixed clock
const PANEL = "https://studio.example.uz/panel";

/* Independent signer: builds what Telegram would send */
function signInitData(fields: Record<string, string>, token = TOKEN) {
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  return new URLSearchParams({ ...fields, hash: createHmac("sha256", secret).update(dcs).digest("hex") }).toString();
}
function signWidget(fields: Record<string, string | number>, token = TOKEN) {
  const dcs = Object.keys(fields).sort().map((k) => `${k}=${fields[k]}`).join("\n");
  const secret = createHash("sha256").update(token).digest();
  return { ...fields, hash: createHmac("sha256", secret).update(dcs).digest("hex") };
}
const user = JSON.stringify({ id: 777000111, first_name: "Malika", username: "malika_decor", language_code: "uz" });

test("initData: valid signature → user, start_param", () => {
  const raw = signInitData({ auth_date: String(NOW - 60), query_id: "AAE1", user, start_param: "inv_abcdefghijklmnop" });
  const r = verifyInitData(raw, TOKEN, NOW);
  assert.ok(r.ok);
  if (r.ok) {
    assert.equal(r.data.user.id, 777000111);
    assert.equal(r.data.startParam, "inv_abcdefghijklmnop");
  }
});
test("initData: tampered field, wrong token, missing hash", () => {
  const raw = signInitData({ auth_date: String(NOW - 60), user });
  const forged = raw.replace("777000111", "777000112");
  assert.deepEqual(verifyInitData(forged, TOKEN, NOW), { ok: false, reason: "bad_hash" });
  assert.deepEqual(verifyInitData(raw, "999:other", NOW), { ok: false, reason: "bad_hash" });
  assert.deepEqual(verifyInitData("auth_date=1&user=x", TOKEN, NOW), { ok: false, reason: "missing" });
  assert.deepEqual(verifyInitData("", TOKEN, NOW), { ok: false, reason: "missing" });
});
test("initData: older than 24 h is expired, far future is malformed", () => {
  assert.deepEqual(verifyInitData(signInitData({ auth_date: String(NOW - 86_401), user }), TOKEN, NOW), { ok: false, reason: "expired" });
  assert.deepEqual(verifyInitData(signInitData({ auth_date: String(NOW + 3600), user }), TOKEN, NOW), { ok: false, reason: "malformed" });
  assert.ok(verifyInitData(signInitData({ auth_date: String(NOW - 86_399), user }), TOKEN, NOW).ok);
});
test("initData: signed but broken user JSON is rejected", () => {
  assert.deepEqual(verifyInitData(signInitData({ auth_date: String(NOW), user: "{" }), TOKEN, NOW), { ok: false, reason: "malformed" });
});

test("login widget: valid, tampered, expired", () => {
  const p = signWidget({ id: 777000111, first_name: "Malika", username: "malika_decor", auth_date: NOW - 10 });
  const r = verifyLoginWidget(p, TOKEN, NOW);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.data.user.username, "malika_decor");
  assert.deepEqual(verifyLoginWidget({ ...p, id: 1 }, TOKEN, NOW), { ok: false, reason: "bad_hash" });
  // the Mini App key must not validate widget data (different secret derivation)
  const asInit = Object.fromEntries(new URLSearchParams(signInitData({ id: "1", first_name: "A", auth_date: String(NOW) })));
  assert.deepEqual(verifyLoginWidget(asInit, TOKEN, NOW), { ok: false, reason: "bad_hash" });
  const old = signWidget({ id: 1, first_name: "A", auth_date: NOW - 90_000 });
  assert.deepEqual(verifyLoginWidget(old, TOKEN, NOW), { ok: false, reason: "expired" });
});

test("shared secret compare", () => {
  assert.ok(verifySecret("s3cret_value", "s3cret_value"));
  assert.ok(!verifySecret("s3cret_valuX", "s3cret_value"));
  assert.ok(!verifySecret("short", "s3cret_value"));
  assert.ok(!verifySecret(null, "s3cret_value"));
  assert.ok(!verifySecret("x", undefined));
});

test("commands and invite params", () => {
  assert.deepEqual(parseCommand("/start"), { cmd: "start", arg: undefined });
  assert.deepEqual(parseCommand("/START@datelle_bot inv_abc"), { cmd: "start", arg: "inv_abc" });
  assert.equal(parseCommand("salom"), null);
  assert.equal(parseInvite("inv_abcdefghijklmnop"), "abcdefghijklmnop");
  assert.equal(parseInvite("inv_short"), undefined);
  assert.equal(parseInvite("inv_<script>aaaaaaaaaaaa"), undefined);
});

const msg = (text: string, type: "private" | "group" = "private"): TgUpdate => ({
  update_id: 1,
  message: { message_id: 1, chat: { id: 42, type }, from: { id: 42, first_name: "Aziz <b>" }, text },
});

test("/start → Mini App button, name escaped", () => {
  const r = replyTo(msg("/start"), PANEL);
  assert.ok(r);
  assert.equal(r.chat_id, 42);
  assert.match(r.text, /Salom, Aziz &lt;b&gt;!/);
  const btn = r.reply_markup?.inline_keyboard[0][0];
  assert.ok(btn && "web_app" in btn);
  if (btn && "web_app" in btn) assert.equal(btn.web_app.url, PANEL);
});
test("/start inv_… → join button carries the token", () => {
  const r = replyTo(msg("/start inv_abcdefghijklmnop"), PANEL);
  const btn = r?.reply_markup?.inline_keyboard[0][0];
  assert.ok(btn && "web_app" in btn);
  if (btn && "web_app" in btn) assert.equal(btn.web_app.url, `${PANEL}?taklif=abcdefghijklmnop`);
});
test("other text → help; groups → only a short notice on /start; no text → silence", () => {
  assert.match(replyTo(msg("salom"), PANEL)?.text ?? "", /Buyruqlar/);
  assert.equal(replyTo(msg("salom", "group"), PANEL), null);
  assert.match(replyTo(msg("/start", "group"), PANEL)?.text ?? "", /shaxsiy chatda/);
  assert.equal(replyTo({ update_id: 2 }, PANEL), null);
});

test("money and date formats", () => {
  assert.equal(formatSum(12_500_000), "12 500 000 soʻm");
  assert.equal(formatSum(900), "900 soʻm");
  assert.equal(shortDate("2026-11-15"), "15-noyabr, ya");
});

test("reminder: empty day sends nothing", () => {
  assert.equal(reminderText({ date: "2026-11-15", orders: [] }), null);
  assert.equal(reminderMessage(1, { date: "2026-11-15", orders: [] }, PANEL), null);
});
test("reminder: lists events, sums only positive balances, links the day", () => {
  const m = reminderMessage(
    42,
    {
      date: "2026-11-15",
      orders: [
        { client: "Malika", place: "Hilton, zal 2", balance: 8_500_000 },
        { client: "Jasur & Co", place: null, balance: 0 },
        { client: "Dilnoza", place: "Uyda", balance: -100_000 }, // overpaid never reduces the total
      ],
    },
    PANEL,
  );
  assert.ok(m);
  assert.match(m.text, /^<b>Ertaga, 15-noyabr, ya — 3 ta tadbir<\/b>/);
  assert.match(m.text, /• Malika — Hilton, zal 2 · qoldiq 8 500 000 soʻm/);
  assert.match(m.text, /• Jasur &amp; Co\n/);
  assert.match(m.text, /Qoldiq: <b>8 500 000 soʻm<\/b>$/);
  const btn = m.reply_markup?.inline_keyboard[0][0];
  if (btn && "web_app" in btn) assert.equal(btn.web_app.url, `${PANEL}/kalendar?sana=2026-11-15`);
  else assert.fail("no web_app button");
});
test("reminder: long days are capped, fully paid days say so", () => {
  const orders = Array.from({ length: 13 }, (_, i) => ({ client: `M${i}`, balance: 0 }));
  const t = reminderText({ date: "2026-11-15", orders }) ?? "";
  assert.equal(t.split("\n").filter((l) => l.startsWith("• ")).length, 10);
  assert.match(t, /va yana 3 ta/);
  assert.match(t, /Qoldiq yoʻq/);
});

test("fan-out: skips empty studios, dedupes, collects blocked users", async () => {
  const day = { date: "2026-11-15", orders: [{ client: "A", balance: 1 }] };
  const studios: StudioDigest[] = [
    { studioId: "s1", chatIds: [1, 2, 2], digest: day },
    { studioId: "s2", chatIds: [3], digest: { date: "2026-11-15", orders: [] } },
    { studioId: "s3", chatIds: [1, 403], digest: day },
  ];
  const sent: number[] = [];
  const res = await fanOutReminders(
    studios,
    PANEL,
    async (m) => {
      if (m.chat_id === 403) throw new Error("blocked");
      sent.push(m.chat_id);
    },
    () => true,
    0,
  );
  assert.deepEqual(sent, [1, 2, 1]);
  assert.deepEqual(res, { studios: 3, sent: 3, empty: 1, failed: 1, blocked: [403] });
});

test("bot config: off without a real token, webhook secret derived and stable", () => {
  const env = { ...process.env };
  try {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    process.env.TELEGRAM_BOT_TOKEN = "123:fake";
    assert.equal(botConfig(), null);
    process.env.TELEGRAM_BOT_TOKEN = "7012345678:AAHk2xJ9-example_token_value_1234567";
    const a = botConfig();
    assert.ok(a);
    assert.match(a.webhookSecret, /^[0-9a-f]{64}$/);
    assert.equal(botConfig()?.webhookSecret, a.webhookSecret);
    process.env.TELEGRAM_WEBHOOK_SECRET = "bad secret!";
    assert.equal(botConfig(), null);
    process.env.TELEGRAM_WEBHOOK_SECRET = "x".repeat(40);
    assert.equal(botConfig()?.webhookSecret, "x".repeat(40));
  } finally {
    process.env = env;
  }
});
