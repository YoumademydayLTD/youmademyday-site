import { describe, expect, it } from "vitest";
import { handleLinkCharges } from "../src/links/charges.ts";
import worker from "../src/index.ts";
import type { Env } from "../src/env.ts";
import { fakeD1, type Call } from "./fake-d1.ts";

const SECRET = "links-secret";
const CHECKOUT = { id: "ch1", item_ids: "plan-focus", currency: "cad", amount: 4700, polar_product_id: "p-focus", status: "succeeded", metadata: "{}", telegram_id: 555 };
const ORDERS = [
  { id: "o2", created_at: "2026-11-21T12:00:00Z", total_amount: 4700, refunded_amount: 0, currency: "cad", status: "paid" },
  { id: "o1", created_at: "2026-11-14T12:00:00Z", total_amount: 4700, refunded_amount: 4700, currency: "cad", status: "refunded" },
];

function storeWith(checkout: object | null, subscription: { id: string } | null) {
  const d1 = fakeD1((call: Call) => {
    if (call.sql.includes("FROM checkouts c")) return checkout;
    if (call.sql.includes("FROM subscriptions")) return subscription && { ...subscription, status: "active", cancel_at_period_end: 0, current_period_end: null };
    if (call.sql.includes("FROM orders") && call.op === "all") return ORDERS;
    return null;
  });
  return { env: { DB: d1.db, YMD_LINKS_SECRET: SECRET, SITE_URL: "https://youmademyday.store", EXTRA_ORIGINS: "" } as unknown as Env, calls: d1.calls };
}
const get = (id = "ch1", secret = SECRET) => new Request(`https://store.test/api/links/${id}/charges`, { headers: { Authorization: `Bearer ${secret}` } });

describe("GET /api/links/:id/charges", () => {
  it("lists the charges of the link and of its membership, amounts in currency units", async () => {
    const { env, calls } = storeWith(CHECKOUT, { id: "sub_1" });
    expect(await handleLinkCharges(get(), env, "ch1")).toEqual({ id: "ch1", charges: [
      { id: "o2", charged_at: "2026-11-21T12:00:00Z", amount: 47, refunded_amount: 0, currency: "cad", status: "paid" },
      { id: "o1", charged_at: "2026-11-14T12:00:00Z", amount: 47, refunded_amount: 47, currency: "cad", status: "refunded" },
    ] });
    const query = calls.find((c) => c.op === "all");
    expect(query?.args).toEqual(["ch1", "sub_1"]);
    expect(query?.sql).toContain("total_amount > 0");
  });
  it("asks only for the checkout's own orders when no membership started", async () => {
    const { env, calls } = storeWith(CHECKOUT, null);
    await handleLinkCharges(get(), env, "ch1");
    expect(calls.find((c) => c.op === "all")?.args).toEqual(["ch1", null]);
  });
  it("refuses an unknown link and a wrong secret", async () => {
    await expect(handleLinkCharges(get("nope"), storeWith(null, null).env, "nope")).rejects.toMatchObject({ code: "not_found" });
    const { env, calls } = storeWith(CHECKOUT, null);
    await expect(handleLinkCharges(get("ch1", "wrong"), env, "ch1")).rejects.toMatchObject({ code: "unauthorized" });
    expect(calls).toHaveLength(0);
  });
  it("is routed", async () => {
    const response = await worker.fetch(get(), storeWith(CHECKOUT, null).env, {} as ExecutionContext);
    expect(response.status).toBe(200);
    expect((await response.json() as { charges: unknown[] }).charges).toHaveLength(2);
  });
});
