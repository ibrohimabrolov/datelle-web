import { test } from "node:test";
import assert from "node:assert/strict";
import { canBlock, dayStatus, eventTone, freeSlots, monthWeeks, reasonLabel } from "../src/lib/studio/calendar";

test("day status: capacity 1 — any order books the day", () => {
  assert.equal(dayStatus(0, 1, false), "free");
  assert.equal(dayStatus(1, 1, false), "booked");
  assert.equal(dayStatus(2, 1, false), "booked"); // over capacity is allowed, still booked
});
test("day status: capacity 3 — has / limited (1 joy) / booked", () => {
  assert.equal(dayStatus(0, 3, false), "free");
  assert.equal(dayStatus(1, 3, false), "has");
  assert.equal(dayStatus(2, 3, false), "limited");
  assert.equal(dayStatus(3, 3, false), "booked");
  assert.equal(dayStatus(5, 3, false), "booked");
});
test("day status: blocked wins over everything", () => {
  assert.equal(dayStatus(0, 3, true), "blocked");
  assert.equal(dayStatus(3, 3, true), "blocked");
  assert.equal(freeSlots(1, 3), 2);
  assert.equal(freeSlots(5, 3), 0);
});
test("month weeks are Monday-first and padded", () => {
  const may = monthWeeks("2026-05"); // 1 May 2026 = Friday
  assert.deepEqual(may[0], [null, null, null, null, "2026-05-01", "2026-05-02", "2026-05-03"]);
  assert.equal(may.length, 5);
  assert.equal(may[4][6], "2026-05-31");
  assert.equal(monthWeeks("2027-02").length, 4); // Feb 2027 starts Monday, 28 days
  assert.equal(monthWeeks("2026-02").length, 5);
  assert.equal(monthWeeks("2026-03").length, 6); // starts Sunday
});
test("block window, reasons, event tones", () => {
  assert.ok(canBlock("2026-11-14", "2026-11-14"));
  assert.ok(!canBlock("2026-11-13", "2026-11-14"));
  assert.ok(!canBlock("2028-11-14", "2026-11-14"));
  assert.equal(reasonLabel("tamir"), "Taʼmir");
  assert.equal(reasonLabel("x"), null);
  assert.equal(eventTone("toy"), "wedding");
  assert.equal(eventTone("qiz-uzatar"), "engagement");
  assert.equal(eventTone("beshik-toy"), "birthday");
  assert.equal(eventTone("korporativ"), "other");
});
