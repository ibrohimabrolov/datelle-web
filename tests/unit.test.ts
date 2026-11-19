import { test } from "node:test";
import assert from "node:assert/strict";
import { addWorkingHours } from "../src/lib/workhours";
import { addDays, dayLabel, isBookable, isISODate, monthDates, weekdayIdx } from "../src/lib/dates";
import { normalizePhone } from "../src/server/phone";

const tash = (iso: string) => new Date(`${iso}+05:00`);
const local = (d: Date) => new Date(d.getTime() + 5 * 3600_000).toISOString().slice(0, 16).replace("T", " ");

test("working hours: daytime request adds plain hours", () => {
  assert.equal(local(addWorkingHours(tash("2026-11-05T10:00:00"), 6)), "2026-11-05 16:00");
});
test("working hours: evening request continues next morning", () => {
  assert.equal(local(addWorkingHours(tash("2026-11-05T20:00:00"), 6)), "2026-11-06 12:00");
});
test("working hours: night request starts counting at 08:00", () => {
  assert.equal(local(addWorkingHours(tash("2026-11-05T23:30:00"), 6)), "2026-11-06 14:00");
  assert.equal(local(addWorkingHours(tash("2026-11-06T06:58:00"), 6)), "2026-11-06 14:00");
});

test("dates: validation, weekday, labels, months", () => {
  assert.ok(isISODate("2026-02-28"));
  assert.ok(!isISODate("2026-02-30"));
  assert.ok(!isISODate("12"));
  assert.equal(weekdayIdx("2026-11-02"), 0); // Monday
  assert.equal(dayLabel("2026-11-13"), "13-noyabr, juma");
  assert.equal(monthDates("2028-02").length, 29);
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("dates: booking window is tomorrow … +365", () => {
  assert.ok(!isBookable("2026-11-05", "2026-11-05"));
  assert.ok(isBookable("2026-11-06", "2026-11-05"));
  assert.ok(!isBookable("2027-11-06", "2026-11-05"));
});

test("phone normalisation", () => {
  assert.equal(normalizePhone("90 123 45 67"), "+998901234567");
  assert.equal(normalizePhone("+998 (90) 123-45-67"), "+998901234567");
  assert.equal(normalizePhone("998901234567"), "+998901234567");
  assert.equal(normalizePhone("12 345 67 89"), null); // unknown operator
  assert.equal(normalizePhone("90123"), null);
});

/* ── Forward → buyurtma parser ── */
import { parseOrder, looksLikeOrder, missingKeyFields } from "../src/lib/studio/parseOrder";
const T = "2026-11-19";

test("parseOrder: typical Uzbek Telegram chat", () => {
  const chat = `Assalomu alaykum! Qizimning to'yi 14-dekabr kuni, Navro'z to'yxonasida bo'ladi.
200 kishi. Byudjet 12 mln atrofida, avans 3 mln tashlab qo'yaman.
Raqamim: 90 123 45 67`;
  assert.deepEqual(parseOrder(chat, { today: T, senderName: "Dilnoza Karimova" }), {
    clientName: "Dilnoza Karimova",
    clientPhone: "+998901234567",
    eventDate: "2026-12-14",
    eventType: "toy",
    venue: "Navro'z to'yxonasi",
    guests: 200,
    total: 12_000_000,
    advance: 3_000_000,
  });
});

test("parseOrder: Russian chat with grouped money and +998", () => {
  const p = parseOrder("Здравствуйте, меня зовут Камола. День рождения дочки 05.01, ресторан «Caravan», 40 человек. Бюджет 4 500 000 сум, предоплата 1 000 000. +998 (93) 555-12-34", { today: T });
  assert.equal(p.clientName, "Камола");
  assert.equal(p.clientPhone, "+998935551234");
  assert.equal(p.eventDate, "2027-01-05"); // already passed this year → next year
  assert.equal(p.eventType, "tugilgan-kun");
  assert.equal(p.guests, 40);
  assert.equal(p.total, 4_500_000);
  assert.equal(p.advance, 1_000_000);
  assert.match(p.venue ?? "", /ресторан/i);
});

test("parseOrder: apostrophe variants, ming, relative date, home", () => {
  const p = parseOrder("Ertaga uyda tugʻilgan kun, 800 ming so'm bo'lsa bo'ladimi?", { today: T });
  assert.equal(p.eventDate, "2026-11-20");
  assert.equal(p.eventType, "tugilgan-kun");
  assert.equal(p.venue, "Uyda");
  assert.equal(p.total, 800_000);
  assert.equal(p.advance, undefined);
});

test("parseOrder: guests and phone digits are never read as money or dates", () => {
  const p = parseOrder("150 kishi, tel 998977001122, 25.12.2026 qiz uzatar", { today: T });
  assert.equal(p.guests, 150);
  assert.equal(p.clientPhone, "+998977001122");
  assert.equal(p.eventDate, "2026-12-25");
  assert.equal(p.eventType, "qiz-uzatar");
  assert.equal(p.total, undefined);
});

test("parseOrder: Cyrillic Uzbek + explicit fields", () => {
  const p = parseOrder("Жой: Ресторан Сафия\nСана 2026-12-31\nЖами 7,5 млн", { today: T });
  assert.equal(p.eventDate, "2026-12-31");
  assert.equal(p.total, 7_500_000);
});

test("parseOrder: small talk is not an order", () => {
  const p = parseOrder("Rahmat katta, gullar juda chiroyli bo'libdi!", { today: T });
  assert.equal(looksLikeOrder(p), false);
  assert.deepEqual(missingKeyFields(p), ["clientName", "clientPhone", "eventDate", "total"]);
});

test("parseOrder: Cyrillic Uzbek venue + guests, clause-bound advance", () => {
  const a = parseOrder("Салом, 22 декабрда тўй бор, 300 киши, Ок сарой тўйхонасида. 99 888 77 66", { today: T });
  assert.equal(a.venue, "Ок сарой тўйхонаси");
  assert.equal(a.guests, 300);
  assert.equal(a.eventDate, "2026-12-22");
  const b = parseOrder("kelishdik 9 mln, 2 mln avans berdim", { today: T });
  assert.deepEqual([b.total, b.advance], [9_000_000, 2_000_000]);
  const c = parseOrder("12.12 ga korporativ, zalda 80 kishi, 5mln, oldindan 1.5 mln beraman", { today: T });
  assert.deepEqual([c.total, c.advance, c.venue], [5_000_000, 1_500_000, undefined]);
  const d = parseOrder("Девичник 7 марта, в кафе Bon, бюджет 2,5 млн. Ismim Jasur", { today: T });
  assert.deepEqual([d.venue, d.total, d.clientName, d.eventDate], ["кафе Bon", 2_500_000, "Jasur", "2027-03-07"]);
});
