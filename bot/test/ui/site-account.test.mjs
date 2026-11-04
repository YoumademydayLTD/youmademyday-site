// Unit tests for the site's personal-area rules (site/js/account/status.js) and the sign-in intent (site/js/checkout/intent.js).
import test from "node:test";
import assert from "node:assert/strict";
const SITE = new URL("../../../site/js", import.meta.url).href;
let store = {}; let throws = false;
globalThis.sessionStorage = {
  getItem: (k) => { if (throws) throw new Error("x"); return store[k] ?? null; },
  setItem: (k, v) => { if (throws) throw new Error("x"); store[k] = v; },
  removeItem: (k) => { if (throws) throw new Error("x"); delete store[k]; },
};
console.error = () => {};
const S = await import(`${SITE}/account/status.js`);
const I = await import(`${SITE}/checkout/intent.js`);
const END = "2026-11-11T10:00:00Z";

test("membershipState: running, trial, ending", () => {
  assert.deepEqual(S.membershipState({ status: "active", currentPeriodEnd: END }), { key: "active", date: END, hasNextCharge: true });
  assert.deepEqual(S.membershipState({ status: "trialing", isTrial: true, currentPeriodEnd: END }), { key: "trial", date: END, hasNextCharge: true });
  assert.equal(S.membershipState({ status: "active", isTrial: true, currentPeriodEnd: END }).key, "trial");
  assert.deepEqual(S.membershipState({ status: "active", cancelAtPeriodEnd: true, currentPeriodEnd: END }), { key: "ending", date: END, hasNextCharge: false });
  assert.equal(S.membershipState({ status: "active" }).hasNextCharge, false);
});
test("membershipState: ended and problem states", () => {
  assert.equal(S.membershipState({ status: "canceled", cancelAtPeriodEnd: true, currentPeriodEnd: END }).key, "canceled");
  assert.equal(S.membershipState({ status: "past_due" }).key, "payIssue");
  assert.equal(S.membershipState({ status: "unpaid" }).key, "payIssue");
  assert.equal(S.membershipState({ status: "incomplete" }).key, "incomplete");
  assert.equal(S.membershipState({ status: "something_new" }).key, "incomplete");
});
test("isTrialMembership", () => {
  assert.equal(S.isTrialMembership({ status: "trialing" }), true);
  assert.equal(S.isTrialMembership({ status: "active", isTrial: true }), true);
  assert.equal(S.isTrialMembership({ status: "active", isTrial: false }), false);
});
test("moneyOf: minor units, upper-case currency, unknowns", () => {
  assert.deepEqual(S.moneyOf(14700, "ils"), { amount: 147, currency: "ILS" });
  assert.deepEqual(S.moneyOf(3950, "usd"), { amount: 39.5, currency: "USD" });
  assert.deepEqual(S.moneyOf(0, "usd"), { amount: 0, currency: "USD" });
  assert.equal(S.moneyOf(null, "usd"), null);
  assert.equal(S.moneyOf(100, ""), null);
  assert.equal(S.moneyOf(100, undefined), null);
});
test("formatDate: real, missing and broken", () => {
  assert.equal(S.formatDate("2026-11-04T12:00:00Z", "en-US"), "November 4, 2026");
  assert.match(S.formatDate("2026-11-04T12:00:00Z", "he-IL"), /2026/);
  assert.equal(S.formatDate(null, "en-US"), "");
  assert.equal(S.formatDate("not a date", "en-US"), "");
});
test("intent: remember, peek, take once", () => {
  store = {};
  I.rememberIntent({ route: "checkout", order: { kind: "cart", ids: ["a"] } }, 1000);
  assert.deepEqual(I.peekIntent(2000), { route: "checkout", order: { kind: "cart", ids: ["a"] }, savedAt: 1000 });
  assert.equal(I.takeIntent(2000).route, "checkout");
  assert.equal(I.takeIntent(2000), null);
  I.rememberIntent({ route: "account" }, 0);
  assert.equal(I.peekIntent(0).order, null);
});
test("intent: expires, bad data, storage that throws", () => {
  store = {};
  I.rememberIntent({ route: "checkout" }, 0);
  assert.notEqual(I.peekIntent(I.INTENT_TTL_MS), null);
  assert.equal(I.peekIntent(I.INTENT_TTL_MS + 1), null);
  assert.equal(I.takeIntent(I.INTENT_TTL_MS + 1), null);
  assert.deepEqual(store, {});
  store = { "ymd-after-login": "{broken" };
  assert.equal(I.peekIntent(0), null);
  store = { "ymd-after-login": JSON.stringify({ route: 5, savedAt: 0 }) };
  assert.equal(I.peekIntent(0), null);
  throws = true;
  assert.doesNotThrow(() => I.rememberIntent({ route: "checkout" }));
  assert.equal(I.peekIntent(), null);
  assert.equal(I.takeIntent(), null);
  throws = false;
});
