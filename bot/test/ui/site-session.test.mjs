// Unit tests for the site's sign-in session module (site/js/telegram), which talks to this worker's login API.
import test from "node:test";
import assert from "node:assert/strict";
globalThis.window = new EventTarget();
let store = {}; let storageThrows = false;
globalThis.localStorage = { getItem: (k) => { if (storageThrows) throw new Error("x"); return store[k] ?? null; }, setItem: (k, v) => { if (storageThrows) throw new Error("x"); store[k] = v; }, removeItem: (k) => { delete store[k]; } };
let replies = [];
globalThis.fetch = async (url, opts) => { const r = replies.shift(); if (!r) throw new Error("no reply"); if (r === "net") throw new TypeError("net"); r.seen?.(url, opts); return { status: r.status, json: async () => r.body }; };
console.error = () => {};
const { digitsOf } = await import(new URL("../../../site/js/telegram/code-digits.js", import.meta.url).href);
const S = await import(new URL("../../../site/js/telegram/session.js", import.meta.url).href);

test("digitsOf", () => {
  assert.equal(digitsOf("12 34-56"), "123456");
  assert.equal(digitsOf("١٢٣۴۵۶"), "123456");
  assert.equal(digitsOf("abc"), "");
  assert.equal(digitsOf(""), "");
});
test("verify maps statuses and stores only the token", async () => {
  replies = [{ status: 401, body: {} }, { status: 429, body: {} }, "net", { status: 500, body: {} }];
  for (const want of ["wrong", "limited", "network", "network"]) assert.equal((await S.verifyCode("123456")).status, want);
  replies = [{ status: 200, body: { status: "ok", session: "S1", user: { id: 1, name: "Dana", username: null, lang: "he" } } }];
  assert.equal((await S.verifyCode("123456")).status, "ok");
  assert.deepEqual(store, { "ymd-session": "S1" });
  assert.equal(S.getUser().name, "Dana");
});
test("me 401 clears, network keeps", async () => {
  replies = ["net"]; await S.fetchMe(); assert.equal(S.isSignedIn(), true);
  replies = [{ status: 200, body: { user: { id: 1, name: "D" } }, seen: (u, o) => assert.equal(o.headers.Authorization, "Bearer S1") }];
  await S.fetchMe(); assert.equal(S.getUser().name, "D");
  replies = [{ status: 401, body: {} }]; await S.fetchMe(); assert.equal(S.isSignedIn(), false); assert.deepEqual(store, {});
});
test("wait: pending, network retry, then ok", async () => {
  replies = [{ status: 200, body: { status: "pending" } }, "net", { status: 200, body: { status: "ok", session: "S2", user: { name: "X" } } }];
  const r = await S.waitLogin({ token: "T", expiresAt: Date.now() / 1000 + 300, isActive: () => true });
  assert.equal(r.status, "ok"); assert.equal(store["ymd-session"], "S2");
});
test("wait: expired from server, from clock, 4xx, and stop", async () => {
  replies = [{ status: 200, body: { status: "expired" } }];
  assert.equal((await S.waitLogin({ token: "T", expiresAt: Date.now() / 1000 + 300, isActive: () => true })).status, "expired");
  assert.equal((await S.waitLogin({ token: "T", expiresAt: Date.now() / 1000 - 1, isActive: () => true })).status, "expired");
  replies = [{ status: 404, body: {} }];
  assert.equal((await S.waitLogin({ token: "T", expiresAt: Date.now() / 1000 + 300, isActive: () => true })).status, "expired");
  assert.equal((await S.waitLogin({ token: "T", expiresAt: Date.now() / 1000 + 300, isActive: () => false })).status, "stopped");
});
test("logout clears locally even if the server fails; storage throwing still works", async () => {
  replies = ["net"]; await S.logout(); assert.equal(S.isSignedIn(), false); assert.deepEqual(store, {});
  storageThrows = true;
  replies = [{ status: 200, body: { status: "ok", session: "S3", user: { name: "Y" } } }];
  assert.equal((await S.verifyCode("111111")).status, "ok"); assert.equal(S.isSignedIn(), true);
  storageThrows = false;
});
test("start validates the ticket", async () => {
  replies = [{ status: 200, body: { token: "T", deepLink: "https://t.me/youmademydaystore_bot?start=login-T", expiresAt: 1 } }, { status: 200, body: {} }];
  assert.equal((await S.startLogin()).status, "ok"); assert.equal((await S.startLogin()).status, "network");
});
