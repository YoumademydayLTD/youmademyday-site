import { afterEach, describe, expect, it, vi } from "vitest";
import { handleLink, handleLinkStatus } from "../src/links/handler.ts";
import { applyOrder, shouldNotifyBuyer } from "../src/webhook/order.ts";
import { paymentEmail } from "../src/customers/ym.ts";
import type { Env } from "../src/env.ts";
import { fakeD1, type Answer } from "./fake-d1.ts";

const SECRET = "links-secret";
const NOW = new Date("2026-11-04T12:00:00Z");
const TELEGRAM_ID = 555_000_111;
const YM = "ym0042";

interface PolarCall { method: string; path: string; body: unknown }

/** A stand-in for Polar's API: records each call and answers like Polar does. */
function stubPolar(): PolarCall[] {
  const calls: PolarCall[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const path = url.replace("https://polar.test/v1", "");
    calls.push({ method: init.method ?? "GET", path, body: init.body ? JSON.parse(String(init.body)) : undefined });
    if (path.startsWith("/customers/external/")) return new Response('{"detail":"Not found"}', { status: 404 });
    if (path === "/customers/") return Response.json({ id: "cus_1", external_id: YM, email: paymentEmail(YM) });
    if (path === "/checkouts/") return Response.json({ id: "ch_1", url: "https://polar.sh/checkout/ch_1", status: "open", expires_at: "2026-11-04T13:00:00Z" });
    return new Response("unexpected", { status: 500 });
  }));
  return calls;
}

function envWith(answer: Answer) {
  const d1 = fakeD1(answer);
  const bot = vi.fn(async () => new Response("{}"));
  const env = {
    DB: d1.db, BOT: { fetch: bot }, BOT_URL: "https://bot.test", POLAR_API: "https://polar.test/v1", POLAR_ACCESS_TOKEN: "polar-token",
    YMD_LINKS_SECRET: SECRET, YMD_INTERNAL_SECRET: "internal", CRX_STATUS_CALLBACK_URL: "",
  } as unknown as Env;
  return { env, calls: d1.calls, bot };
}

const customerRow = { id: 42, ym: YM, telegram_id: TELEGRAM_ID, polar_customer_id: null, country: null };
const linkRequest = (body: unknown, secret = SECRET) =>
  new Request("https://store.test/api/links", { method: "POST", headers: { Authorization: `Bearer ${secret}` }, body: JSON.stringify(body) });

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/links with telegram_user_id", () => {
  it("creates the customer silently and locks the checkout to his ym number and internal email", async () => {
    const polar = stubPolar();
    const { env, calls, bot } = envWith((call) => (call.sql.includes("FROM customers WHERE telegram_id") ? customerRow : undefined));
    const reply = await handleLink(linkRequest({ product: "plan-max", currency: "gel", telegram_user_id: TELEGRAM_ID, lang: "he" }), env, NOW);
    expect(reply).toEqual({ url: "https://polar.sh/checkout/ch_1", id: "ch_1", expires_at: "2026-11-04T13:00:00Z" });
    // The same customers row the Telegram sign-in finds later.
    expect(calls.find((c) => c.sql.startsWith("INSERT INTO customers"))?.args[0]).toBe(TELEGRAM_ID);
    expect(polar.find((c) => c.path === "/customers/")?.body).toEqual({ external_id: YM, email: paymentEmail(YM), type: "individual" });
    const checkout = polar.find((c) => c.path === "/checkouts/")?.body as Record<string, unknown>;
    expect(checkout).toMatchObject({ external_customer_id: YM, currency: "gel", trial_interval: "day", trial_interval_count: 1, metadata: { ymd_source: "crx", ymd_ids: "max", ymd_customer: YM } });
    expect(checkout.success_url).toBeUndefined();
    const insert = calls.find((c) => c.sql.includes("INSERT INTO checkouts"));
    expect(insert?.args.slice(0, 3)).toEqual(["ch_1", "crx", "link"]);
    expect(insert?.args[3]).toBe("max");
    expect(insert?.args[10]).toBe(YM); // customer_ym: his personal area lists the purchase
    // Nothing is sent to him: no bot call, and only these Polar calls (Polar's own emails are off for the organization).
    expect(bot).not.toHaveBeenCalled();
    expect(polar.map((c) => `${c.method} ${c.path}`)).toEqual([`GET /customers/external/${YM}`, "POST /customers/", "POST /checkouts/"]);
  });
  it("works without a Telegram id as before (no customer row, no customer_ym)", async () => {
    const polar = stubPolar();
    const { env, calls } = envWith(() => undefined);
    await handleLink(linkRequest({ product: "b51" }), env, NOW);
    expect(calls.some((c) => c.sql.includes("customers"))).toBe(false);
    expect(polar.map((c) => c.path)).toEqual(["/checkouts/"]);
    expect(calls.find((c) => c.sql.includes("INSERT INTO checkouts"))?.args[10]).toBeNull();
  });
  it("refuses a wrong secret before doing anything", async () => {
    const polar = stubPolar();
    const { env, calls } = envWith(() => undefined);
    await expect(handleLink(linkRequest({ product: "b51", telegram_user_id: 1 }, "wrong"), env, NOW)).rejects.toThrow(/Authorization/);
    expect(calls).toHaveLength(0);
    expect(polar).toHaveLength(0);
  });
});

describe("GET /api/links/:id/status", () => {
  const statusRequest = (secret = SECRET) => new Request("https://store.test/api/links/ch_1/status", { headers: { Authorization: `Bearer ${secret}` } });
  it("reads a CRX link's state from the tables", async () => {
    const { env } = envWith((call) => {
      if (call.sql.includes("FROM checkouts")) return { id: "ch_1", item_ids: "max", currency: "gel", amount: 10_000, polar_product_id: "3f5716cd-f3c8-4c21-8259-2d20d667cb7b", status: "succeeded", telegram_id: TELEGRAM_ID };
      if (call.sql.includes("FROM subscriptions")) return { id: "sub_1", status: "trialing", cancel_at_period_end: 0, current_period_end: "2026-11-05T12:00:00Z" };
      return undefined;
    });
    expect(await handleLinkStatus(statusRequest(), env, "ch_1")).toMatchObject({ status: "trialing", product: "plan-max", amount: 100, currency: "gel", telegram_user_id: TELEGRAM_ID });
  });
  it("only shows checkouts CRX opened, and asks for the secret", async () => {
    const { env, calls } = envWith(() => undefined);
    await expect(handleLinkStatus(statusRequest(), env, "site-checkout")).rejects.toThrow(/no CRX link/);
    expect(calls[0]?.sql).toContain("c.source = 'crx'");
    await expect(handleLinkStatus(statusRequest("wrong"), env, "ch_1")).rejects.toThrow(/Authorization/);
  });
});

describe("paid orders of CRX links", () => {
  it("never message the buyer; the store's own checkouts still do", () => {
    expect(shouldNotifyBuyer({ source: "crx" })).toBe(false);
    expect(shouldNotifyBuyer({ source: "site" })).toBe(true);
    expect(shouldNotifyBuyer(null)).toBe(false);
  });
  const paidOrder = { id: "ord_1", status: "paid", checkout_id: "ch_1", product_id: "b4d6043c-5962-4a9e-a866-e1457d9b5209", total_amount: 500, currency: "ils", metadata: {} };
  const tables = (source: string): Answer => (call) => {
    if (call.sql.includes("FROM checkouts WHERE id")) return { item_ids: "b51", lang: "he", source };
    if (call.sql.includes("JOIN customers")) return { telegram_id: TELEGRAM_ID };
    return undefined;
  };
  it("records the entitlement but does not call the bot for a CRX link", async () => {
    const { env, calls, bot } = envWith(tables("crx"));
    await applyOrder(env, paidOrder, NOW.toISOString());
    expect(calls.some((c) => c.sql.includes("INSERT INTO entitlements"))).toBe(true);
    expect(calls.some((c) => c.sql.includes("INSERT INTO orders"))).toBe(true);
    expect(bot).not.toHaveBeenCalled();
  });
  it("calls the bot for a site checkout", async () => {
    const { env, bot } = envWith(tables("site"));
    await applyOrder(env, paidOrder, NOW.toISOString());
    expect(bot).toHaveBeenCalledOnce();
  });
});
