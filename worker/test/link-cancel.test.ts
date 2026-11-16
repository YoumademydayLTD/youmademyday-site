import { afterEach, describe, expect, it, vi } from "vitest";
import { handleLinkCancel } from "../src/links/cancel.ts";
import worker from "../src/index.ts";
import type { Env } from "../src/env.ts";
import { fakeD1, type Answer, type Call } from "./fake-d1.ts";

const SECRET = "links-secret";
const NOW = new Date("2026-11-15T12:00:00Z");
const TELEGRAM_ID = 555_000_111;
const CHECKOUT = { id: "ch1", item_ids: "plan-focus", currency: "cad", amount: 4700, polar_product_id: "p-focus", status: "succeeded", metadata: "{}", telegram_id: TELEGRAM_ID };
const CUSTOMER = { id: 42, ym: "ym0042", telegram_id: TELEGRAM_ID, polar_customer_id: "pc_1", country: null };
const PERIOD_END = "2026-11-21T12:00:00Z";

/** A store whose subscription row changes when the cancel writes it, as D1 would. */
function storeWith(subscription: { status: string; cancel_at_period_end: number } | null, checkout: object | null = CHECKOUT) {
  let row = subscription && { id: "sub_1", current_period_end: PERIOD_END, ...subscription };
  const answer: Answer = (call: Call) => {
    if (call.sql.includes("FROM checkouts c")) return checkout;
    if (call.sql.includes("FROM orders")) return null;
    if (call.sql.includes("FROM customers WHERE telegram_id")) return CUSTOMER;
    if (call.sql.startsWith("INSERT INTO subscriptions") && row) {
      row = { ...row, status: String(call.args[5]), cancel_at_period_end: Number(call.args[7]) };
      return undefined;
    }
    if (call.sql.includes("FROM subscriptions")) return row && { ...row, plan_id: "focus", amount: 4700, currency: "cad" };
    return undefined;
  };
  const d1 = fakeD1(answer);
  const env = { DB: d1.db, YMD_LINKS_SECRET: SECRET, POLAR_API: "https://polar.test/v1", POLAR_ACCESS_TOKEN: "t", SITE_URL: "https://youmademyday.store", EXTRA_ORIGINS: "" } as unknown as Env;
  return { env, calls: d1.calls };
}

/** Polar answering a cancel with the membership's new state. */
function polarAnswers(state: { status: string; cancel_at_period_end: boolean }) {
  const polar = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({
    id: "sub_1", customer_id: "pc_1", product_id: "p-focus", current_period_end: PERIOD_END, ...state,
  }), { headers: { "content-type": "application/json" } }));
  vi.stubGlobal("fetch", polar);
  return polar;
}

const post = (id = "ch1", secret = SECRET) =>
  new Request(`https://store.test/api/links/${id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${secret}` } });

afterEach(() => vi.unstubAllGlobals());

describe("POST /api/links/:id/cancel", () => {
  it("ends a free-day membership at once (no charge) and answers the link's new status", async () => {
    const polar = polarAnswers({ status: "canceled", cancel_at_period_end: false });
    const { env } = storeWith({ status: "trialing", cancel_at_period_end: 0 });
    const status = await handleLinkCancel(post(), env, "ch1", NOW);
    expect(polar.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(status.status).toBe("canceled");
    expect(status.subscription).toMatchObject({ id: "sub_1", cancel_at_period_end: false });
  });
  it("lets a paid week run to its end and never renew", async () => {
    const polar = polarAnswers({ status: "active", cancel_at_period_end: true });
    const { env } = storeWith({ status: "active", cancel_at_period_end: 0 });
    const status = await handleLinkCancel(post(), env, "ch1", NOW);
    expect(polar.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(JSON.parse(String(polar.mock.calls[0]?.[1]?.body))).toEqual({ cancel_at_period_end: true });
    expect(status.status).toBe("active");
    expect(status.subscription).toMatchObject({ cancel_at_period_end: true, current_period_end: PERIOD_END });
  });
  it("refuses a membership that is already ending, without calling Polar", async () => {
    const polar = polarAnswers({ status: "active", cancel_at_period_end: true });
    const { env } = storeWith({ status: "active", cancel_at_period_end: 1 });
    await expect(handleLinkCancel(post(), env, "ch1", NOW)).rejects.toMatchObject({ code: "conflict" });
    expect(polar).not.toHaveBeenCalled();
  });
  it("refuses a link that started no membership, and an unknown link", async () => {
    polarAnswers({ status: "active", cancel_at_period_end: true });
    await expect(handleLinkCancel(post(), storeWith(null).env, "ch1", NOW)).rejects.toMatchObject({ code: "conflict" });
    await expect(handleLinkCancel(post("nope"), storeWith(null, null).env, "nope", NOW)).rejects.toMatchObject({ code: "not_found" });
  });
  it("refuses a wrong secret before reading anything", async () => {
    const { env, calls } = storeWith({ status: "active", cancel_at_period_end: 0 });
    await expect(handleLinkCancel(post("ch1", "wrong"), env, "ch1", NOW)).rejects.toMatchObject({ code: "unauthorized" });
    expect(calls).toHaveLength(0);
  });
  it("is routed", async () => {
    polarAnswers({ status: "active", cancel_at_period_end: true });
    const { env } = storeWith({ status: "active", cancel_at_period_end: 0 });
    const response = await worker.fetch(post(), env, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "ch1", status: "active" });
  });
});
