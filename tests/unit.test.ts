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
