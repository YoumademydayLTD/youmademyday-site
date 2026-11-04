import { describe, expect, it } from "vitest";
import { canCancel, cancelQuestion, membershipLine } from "../src/billing/membership-lines.ts";
import { parsePaidOrder } from "../src/internal/orders-http.ts";
import { assertInternal } from "../src/internal/auth.ts";
import { queryKind } from "../src/admin/customers.ts";
import { membershipBlock } from "../src/billing/screen.ts";
import type { UserSubscription } from "../src/billing/subscriptions.ts";
import type { BotUser } from "../src/users/repo.ts";

const sub = (over: Partial<UserSubscription>): UserSubscription => ({ id: "s1", planId: "grow", status: "active", currentPeriodEnd: "2026-11-11T09:00:00Z", cancelAtPeriodEnd: false, ...over });

describe("membership lines", () => {
  it("can cancel only running memberships that are not ending", () => {
    expect(canCancel(sub({}))).toBe(true);
    expect(canCancel(sub({ status: "trialing" }))).toBe(true);
    expect(canCancel(sub({ cancelAtPeriodEnd: true }))).toBe(false);
    expect(canCancel(sub({ status: "past_due" }))).toBe(false);
  });
  it("describes renewal, trial and ending in the user's language", () => {
    expect(membershipLine("en", sub({}))).toBe("Growth: active, renews on November 11");
    expect(membershipLine("en", sub({ status: "trialing" }))).toBe("Growth: free trial day, first charge on November 11");
    expect(membershipLine("he", sub({ cancelAtPeriodEnd: true }))).toContain("מסתיים");
  });
  it("asks differently for a trial (ends now) and a paid period (ends at its end)", () => {
    expect(cancelQuestion("en", sub({ status: "trialing" }))).toMatch(/right now/);
    expect(cancelQuestion("en", sub({}))).toMatch(/until November 11/);
  });
  it("lists memberships with one cancel button per cancellable one", () => {
    const user = { lang: "en" } as BotUser;
    const block = membershipBlock(user, [sub({}), sub({ id: "s2", planId: "max", cancelAtPeriodEnd: true })]);
    expect(block.text.split("\n")).toHaveLength(3);
    expect(block.rows).toEqual([[{ text: "Cancel Growth", callback_data: "sub:ask:s1" }]]);
    expect(membershipBlock(user, [])).toEqual({ text: "", rows: [] });
  });
});

describe("internal calls", () => {
  it("reads a paid order notice", () => {
    expect(parsePaidOrder({ checkoutId: "b7451296-aa84-48f1-bca3-371877c224b2", telegramId: 42 })).toEqual({ checkoutId: "b7451296-aa84-48f1-bca3-371877c224b2", telegramId: 42 });
    expect(() => parsePaidOrder({ checkoutId: "x", telegramId: 42 })).toThrow();
    expect(() => parsePaidOrder({ checkoutId: "b7451296-aa84-48f1-bca3-371877c224b2", telegramId: "42" })).toThrow();
    expect(() => parsePaidOrder(null)).toThrow();
  });
  it("needs the shared secret", () => {
    const request = (value: string) => new Request("https://b/api/internal/orders/paid", { headers: { "X-Internal-Secret": value } });
    expect(() => assertInternal(request("k"), "k")).not.toThrow();
    expect(() => assertInternal(request("x"), "k")).toThrow();
    expect(() => assertInternal(request(""), "")).toThrow();
  });
});

describe("customer search", () => {
  it("tells a customer number, a Telegram id and a name apart", () => {
    expect(queryKind("ym0001")).toBe("ym");
    expect(queryKind("YM0012")).toBe("ym");
    expect(queryKind("123456")).toBe("telegram");
    expect(queryKind("Dana")).toBe("name");
  });
});
