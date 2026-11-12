import { describe, expect, it } from "vitest";
import { callerMetadata, linkStateOf, linkStatus, type LinkFacts } from "../src/links/link-status.ts";
import { parseStoredMetadata } from "../src/db/links.ts";
import { MAP } from "./fixtures.ts";

const checkout = { id: "ch1", itemIds: ["max"], currency: "gel", amount: 10_000, polarProductId: "p-max", status: "succeeded", telegramId: 777, metadata: { ymd_source: "crx", ymd_ids: "max", ref: "r-9" } };
const facts = (over: Partial<LinkFacts> = {}): LinkFacts => ({ checkout, order: null, subscription: null, ...over });
const sub = (status: string) => ({ id: "s1", status, cancelAtPeriodEnd: false, currentPeriodEnd: "2026-11-12T00:00:00Z" });

describe("linkStateOf", () => {
  it("is pending until Polar reports an order", () => {
    expect(linkStateOf({ order: null, subscription: null })).toBe("pending");
    expect(linkStateOf({ order: { status: "pending" }, subscription: null })).toBe("pending");
  });
  it("is paid for a paid one-time order", () => {
    expect(linkStateOf({ order: { status: "paid" }, subscription: null })).toBe("paid");
  });
  it("is refunded after a full or partial refund, even with a membership", () => {
    expect(linkStateOf({ order: { status: "refunded" }, subscription: null })).toBe("refunded");
    expect(linkStateOf({ order: { status: "partially_refunded" }, subscription: sub("active") })).toBe("refunded");
  });
  it("follows the membership's state once there is one, even before a paid order", () => {
    expect(linkStateOf({ order: null, subscription: sub("trialing") })).toBe("trialing");
    expect(linkStateOf({ order: { status: "paid" }, subscription: sub("trialing") })).toBe("trialing");
    expect(linkStateOf({ order: { status: "paid" }, subscription: sub("active") })).toBe("active");
    expect(linkStateOf({ order: null, subscription: sub("past_due") })).toBe("active");
    expect(linkStateOf({ order: null, subscription: sub("incomplete") })).toBe("pending");
    for (const ended of ["canceled", "unpaid", "incomplete_expired", "paused"]) expect(linkStateOf({ order: null, subscription: sub(ended) })).toBe("canceled");
    expect(linkStateOf({ order: null, subscription: sub("something_new") })).toBe("pending");
  });
});

describe("linkStatus", () => {
  it("answers in the shape CRX reads, amount in currency units", () => {
    expect(linkStatus(facts({ subscription: sub("trialing") }), MAP)).toEqual({
      id: "ch1", status: "trialing", product: "plan-max", amount: 100, currency: "gel", telegram_user_id: 777, checkout_status: "succeeded", metadata: { ref: "r-9" },
      subscription: { id: "s1", status: "trialing", cancel_at_period_end: false, current_period_end: "2026-11-12T00:00:00Z" },
    });
  });
  it("names a one-time product by its store id and has no telegram id for an anonymous link", () => {
    const status = linkStatus(facts({ checkout: { ...checkout, itemIds: ["b51"], currency: "ils", amount: 500, polarProductId: "p-b51", telegramId: null }, order: { status: "paid" } }), MAP);
    expect(status).toMatchObject({ status: "paid", product: "b51", amount: 5, currency: "ils", telegram_user_id: null });
    expect(status.subscription).toBeUndefined();
  });
  it("falls back to the recorded item for a product no longer mapped", () => {
    expect(linkStatus(facts({ checkout: { ...checkout, polarProductId: "gone" } }), MAP).product).toBe("max");
  });
});

describe("the caller's metadata on a status", () => {
  it("comes back as sent, without the store's own ymd_ keys", () => {
    expect(callerMetadata({ ymd_source: "crx", ymd_kind: "link", ymd_customer: "ym0042", ref: "r-9", step: "3" })).toEqual({ ref: "r-9", step: "3" });
    expect(callerMetadata({})).toEqual({});
  });
  it("reads the stored column, and treats an empty or damaged one as no metadata", () => {
    expect(parseStoredMetadata('{"ref":"r-9","n":3,"ok":true}')).toEqual({ ref: "r-9", n: "3", ok: "true" });
    expect(parseStoredMetadata(null)).toEqual({});
    expect(parseStoredMetadata("")).toEqual({});
    expect(parseStoredMetadata("not json")).toEqual({});
    expect(parseStoredMetadata("[1,2]")).toEqual({});
    expect(parseStoredMetadata("null")).toEqual({});
  });
});
