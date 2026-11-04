// Unit tests for the reader's pure rules. Run: node --test site/test/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseReadRoute, readHref, readRoute } from "../js/reader/route.js";
import { lastUnitOf, rememberUnit } from "../js/reader/last-read.js";
import { itemOf, unitOf, unitRefOf, doneStateOf, nextUnitToOpen } from "../js/reader/reply.js";

function memoryStorage() {
  const data = new Map();
  const storage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, String(v)); } };
  return () => storage;
}
const blockedStorage = () => { throw new Error("SecurityError"); };

test("parseReadRoute reads the list page and a unit", () => {
  assert.deepEqual(parseReadRoute("c2"), { id: "c2", n: null });
  assert.deepEqual(parseReadRoute("b14-3"), { id: "b14", n: 3 });
});

test("parseReadRoute refuses broken addresses", () => {
  for (const bad of ["", "c2-0", "c2-", "c2-x", "../c2", "C2", "c2-3-4", "c-1"]) assert.equal(parseReadRoute(bad), null, bad);
});

test("readHref and readRoute build the same addresses parseReadRoute reads", () => {
  assert.equal(readHref("c2"), "#read-c2");
  assert.equal(readHref("c2", 5), "#read-c2-5");
  assert.deepEqual(parseReadRoute(readRoute("k3", 7).slice("read-".length)), { id: "k3", n: 7 });
});

test("last read unit round-trips and stays per item", () => {
  const storage = memoryStorage();
  assert.equal(lastUnitOf("c1", storage), null);
  rememberUnit("c1", 4, storage);
  rememberUnit("b2", 1, storage);
  assert.equal(lastUnitOf("c1", storage), 4);
  assert.equal(lastUnitOf("b2", storage), 1);
});

test("last read survives blocked or broken storage", () => {
  assert.equal(lastUnitOf("c1", blockedStorage), null);
  assert.doesNotThrow(() => rememberUnit("c1", 2, () => { throw new Error("blocked"); }));
  const storage = memoryStorage();
  storage().setItem("ymd-read-last", "{not json");
  assert.equal(lastUnitOf("c1", storage), null);
  storage().setItem("ymd-read-last", JSON.stringify({ c1: -2 }));
  assert.equal(lastUnitOf("c1", storage), null);
});

test("itemOf fills a fixed shape and drops broken units", () => {
  const item = itemOf({ id: "c2", kind: "course", title: "T", units: [{ n: 1, title: "A", minutes: 7.4, done: true }, { n: 0 }, null, { n: 2 }], done: 1 });
  assert.equal(item.kind, "course");
  assert.equal(item.total, 2);
  assert.deepEqual(item.units, [{ n: 1, title: "A", minutes: 7, done: true }, { n: 2, title: "", minutes: null, done: false }]);
  assert.equal(itemOf({}).kind, "book");
  assert.deepEqual(itemOf({}).units, []);
});

test("unitOf and unitRefOf accept a number or an object for the neighbours", () => {
  const unit = unitOf({ id: "b1", kind: "book", n: 2, html: "<p>x</p>", prev: 1, next: { n: 3, title: "Next" }, minutes: null, doneCount: 1, total: 3 });
  assert.deepEqual(unit.prev, { n: 1, title: "" });
  assert.deepEqual(unit.next, { n: 3, title: "Next" });
  assert.equal(unit.minutes, null);
  assert.equal(unitRefOf(null), null);
  assert.equal(unitRefOf({ n: "2" }), null);
  assert.deepEqual(doneStateOf({ done: true, doneCount: 2, total: 5 }), { done: true, doneCount: 2, total: 5 });
  assert.deepEqual(doneStateOf({}), { done: false, doneCount: 0, total: 0 });
});

test("nextUnitToOpen prefers the last open unit, then the first not done", () => {
  const units = [{ n: 1, done: true }, { n: 2, done: false }, { n: 3, done: false }];
  assert.equal(nextUnitToOpen(units, 3), 3);
  assert.equal(nextUnitToOpen(units, 9), 2);
  assert.equal(nextUnitToOpen(units, null), 2);
  assert.equal(nextUnitToOpen([{ n: 1, done: true }], null), 1);
  assert.equal(nextUnitToOpen([], null), null);
});
