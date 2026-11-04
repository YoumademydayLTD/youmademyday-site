// Unit tests for the daily companion's pure rules. Run: node --test site/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { companionOf, newestFirst, safeHref, formatHour, settingsReplyOf, doneReplyOf, HOURS_PER_DAY } from "../js/companion/reply.js";

test("companionOf fills a fixed shape from an empty reply", () => {
  const data = companionOf({});
  assert.equal(data.track, null);
  assert.deepEqual(data.tracks, []);
  assert.equal(data.today, null);
  assert.equal(data.streak, 0);
  assert.equal(data.doneToday, false);
  assert.deepEqual(data.settings, { dailyHour: 8, timeZone: "", paused: false, silent: false });
});

test("companionOf keeps a valid reply and drops broken entries", () => {
  const data = companionOf({
    track: "spark", streak: 4, doneToday: true,
    tracks: [{ id: "spark", isFree: true, canJoin: true }, { id: "money", canJoin: false }, { nope: 1 }],
    today: { dayN: 5, text: "Hi\nthere", lessonUrl: "javascript:alert(1)", lessonLabel: "x" },
    history: [{ dayN: 2, text: "b" }, { dayN: 4, text: "d" }, { dayN: "3", text: "c" }],
    settings: { dailyHour: 23, timeZone: "Asia/Jerusalem", paused: true, silent: true },
  });
  assert.deepEqual(data.tracks.map((t) => t.id), ["spark", "money"]);
  assert.equal(data.tracks[1].isFree, false);
  assert.deepEqual(data.today, { dayN: 5, text: "Hi\nthere", lessonUrl: null, lessonLabel: "" });
  assert.deepEqual(data.history.map((d) => d.dayN), [4, 2]);
  assert.equal(data.settings.dailyHour, 23);
});

test("an hour outside 0–23 falls back to the default", () => {
  assert.equal(settingsReplyOf({ settings: { dailyHour: HOURS_PER_DAY } }).dailyHour, 8);
  assert.equal(settingsReplyOf({ settings: { dailyHour: 0 } }).dailyHour, 0);
});

test("newestFirst sorts past days by day number, newest first", () => {
  assert.deepEqual(newestFirst([{ dayN: 1, text: "" }, { dayN: 3, text: "" }, { dayN: 2, text: "" }]).map((d) => d.dayN), [3, 2, 1]);
  assert.deepEqual(newestFirst(null), []);
});

test("safeHref allows https and same-site links only", () => {
  assert.equal(safeHref("https://youmademyday.store/he/#read-c2-1"), "https://youmademyday.store/he/#read-c2-1");
  assert.equal(safeHref("#read-c2-1"), "#read-c2-1");
  assert.equal(safeHref("/he/books"), "/he/books");
  for (const bad of ["http://x.y", "javascript:alert(1)", "//evil.example", "data:text/html,x", 5, null]) assert.equal(safeHref(bad), null, String(bad));
});

test("formatHour names every hour of the day as a 24-hour clock time", () => {
  assert.equal(formatHour(0, "en-GB"), "00:00");
  assert.equal(formatHour(8, "he-IL"), "08:00");
  assert.equal(formatHour(23, "en-US"), "23:00");
});

test("doneReplyOf reads the streak", () => {
  assert.deepEqual(doneReplyOf({ streak: 6, doneToday: true }), { streak: 6, doneToday: true });
  assert.deepEqual(doneReplyOf({}), { streak: 0, doneToday: false });
});
