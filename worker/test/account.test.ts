import { describe, expect, it } from "vitest";
import { formatYm, isYm, paymentEmail } from "../src/customers/ym.ts";
import { matchRoute } from "../src/http/router.ts";
import { invoiceView, membershipView } from "../src/account/present.ts";
import { cancelModeFor } from "../src/polar/subscriptions.ts";
import { parseUser } from "../src/account/session.ts";
import { assertInternal } from "../src/internal/auth.ts";
import { corsHeaders } from "../src/http/cors.ts";
import { CATALOG } from "./fixtures.ts";

describe("customer numbers", () => {
  it("pads to four digits and grows past 9999", () => {
    expect(formatYm(1)).toBe("ym0001");
    expect(formatYm(42)).toBe("ym0042");
    expect(formatYm(12345)).toBe("ym12345");
  });
  it("gives each customer a plus-addressed payment email", () => {
    expect(paymentEmail("ym0001")).toBe("ymmdpayments+ym0001@gmail.com");
  });
  it("recognises a number", () => {
    expect(isYm("ym0001")).toBe(true);
    expect(isYm("ym01")).toBe(false);
    expect(isYm("x0001")).toBe(false);
  });
});

describe("matchRoute", () => {
  const routes = [{ method: "POST", pattern: "/api/account/subscriptions/:id/cancel", handler: "cancel" }, { method: "GET", pattern: "/api/account", handler: "account" }];
  it("matches static and parameter routes", () => {
    expect(matchRoute(routes, "GET", "/api/account")).toEqual({ handler: "account", params: {}, key: "GET /api/account" });
    expect(matchRoute(routes, "POST", "/api/account/subscriptions/sub_1/cancel")?.params).toEqual({ id: "sub_1" });
  });
  it("rejects other methods, lengths and empty parameters", () => {
    expect(matchRoute(routes, "POST", "/api/account")).toBeNull();
    expect(matchRoute(routes, "POST", "/api/account/subscriptions//cancel")).toBeNull();
    expect(matchRoute(routes, "GET", "/api/account/x")).toBeNull();
  });
});

describe("memberships", () => {
  const base = { id: "s1", planId: "grow", currentPeriodEnd: "2026-11-11T00:00:00Z", amount: 14700, currency: "ils" };
  it("can cancel a running membership that is not ending yet", () => {
    expect(membershipView({ ...base, status: "trialing", cancelAtPeriodEnd: false })).toMatchObject({ isTrial: true, canCancel: true });
    expect(membershipView({ ...base, status: "active", cancelAtPeriodEnd: false }).canCancel).toBe(true);
    expect(membershipView({ ...base, status: "active", cancelAtPeriodEnd: true }).canCancel).toBe(false);
    expect(membershipView({ ...base, status: "canceled", cancelAtPeriodEnd: false }).canCancel).toBe(false);
  });
  it("ends a trial at once and a paid period at its end", () => {
    expect(cancelModeFor("trialing")).toBe("now");
    expect(cancelModeFor("active")).toBe("period_end");
  });
});

describe("invoiceView", () => {
  it("names the items in the buyer's language and never shows the customer number", () => {
    const view = invoiceView({ id: "o1", status: "paid", currency: "ils", totalAmount: 8400, itemIds: ["b9", "b10"], createdAt: "2026-11-04T10:00:00Z" }, CATALOG, "fr", "https://w/api/invoice?t=x");
    expect(view).toEqual({ orderId: "o1", createdAt: "2026-11-04T10:00:00Z", total: 8400, currency: "ils", status: "paid", items: [{ id: "b9", title: "a (fr)" }, { id: "b10", title: "b (fr)" }], url: "https://w/api/invoice?t=x" });
    expect(JSON.stringify(view)).not.toMatch(/ym\d/);
  });
});

describe("parseUser", () => {
  it("reads the bot's /api/me reply", () => {
    expect(parseUser({ user: { id: 5, name: "Dana", username: null, lang: "he" } })).toEqual({ telegramId: 5, name: "Dana", lang: "he" });
    expect(parseUser({ user: { id: "5", lang: "he" } })).toBeNull();
    expect(parseUser(null)).toBeNull();
  });
});

describe("assertInternal", () => {
  const request = (secret?: string) => new Request("https://w/api/internal/x", { headers: secret === undefined ? {} : { "X-Internal-Secret": secret } });
  it("accepts only the shared secret", () => {
    expect(() => assertInternal(request("s3"), "s3")).not.toThrow();
    expect(() => assertInternal(request("no"), "s3")).toThrow();
    expect(() => assertInternal(request(), "s3")).toThrow();
    expect(() => assertInternal(request(""), "")).toThrow();
  });
});

describe("cors", () => {
  it("lets the site send its session header", () => {
    expect(corsHeaders("https://youmademyday.store", new Set(["https://youmademyday.store"]))["Access-Control-Allow-Headers"]).toContain("Authorization");
  });
});
