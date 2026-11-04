import { describe, expect, it } from "vitest";
import { needsAck, preview, routeMessage } from "../src/support/routing.ts";
import { adminFrom, evaluateClaim } from "../src/admin/guard.ts";
import { isWebhookAuthentic, SECRET_HEADER } from "../src/webhook/secret.ts";

describe("support routing", () => {
  const base = { fromId: 1, isAdmin: false, isCommand: false, replyToMessageId: null };
  it("sends customer text to support, commands to commands", () => {
    expect(routeMessage(base)).toEqual({ kind: "support" });
    expect(routeMessage({ ...base, replyToMessageId: 5 })).toEqual({ kind: "support" });
    expect(routeMessage({ ...base, isCommand: true })).toEqual({ kind: "command" });
  });

  it("routes the admin's reply to a notice back to the customer", () => {
    expect(routeMessage({ ...base, isAdmin: true, replyToMessageId: 99 })).toEqual({ kind: "admin-reply", noticeMessageId: 99 });
    expect(routeMessage({ ...base, isAdmin: true })).toEqual({ kind: "admin-hint" });
    expect(routeMessage({ ...base, isAdmin: true, isCommand: true })).toEqual({ kind: "command" });
  });

  it("acks a thread once and previews messages", () => {
    expect(needsAck({ isAcked: false })).toBe(true);
    expect(needsAck({ isAcked: true })).toBe(false);
    expect(preview("  hello\n\nthere ", null, 50)).toBe("hello there");
    expect(preview("", "photo", 50)).toBe("[photo]");
    expect(preview("abcdefghij", null, 5)).toBe("abcd…");
  });
});

describe("admin guard", () => {
  const code = "k".repeat(24);
  it("claims once with the exact code", () => {
    expect(evaluateClaim({ configuredCode: code, givenCode: code, isClaimed: false })).toBe("claimed");
    expect(evaluateClaim({ configuredCode: code, givenCode: code, isClaimed: true })).toBe("already-claimed");
    expect(evaluateClaim({ configuredCode: code, givenCode: `${code}x`, isClaimed: false })).toBe("wrong-code");
    expect(evaluateClaim({ configuredCode: "short", givenCode: "short", isClaimed: false })).toBe("disabled");
    expect(evaluateClaim({ configuredCode: "", givenCode: "", isClaimed: false })).toBe("disabled");
  });

  it("lets only admin-scoped sessions of current admins through", () => {
    const admins = new Set([7]);
    expect(adminFrom({ telegramId: 7, scope: "admin" }, admins)).toBe(7);
    expect(adminFrom({ telegramId: 7, scope: "site" }, admins)).toBeNull();
    expect(adminFrom({ telegramId: 8, scope: "admin" }, admins)).toBeNull();
    expect(adminFrom(null, admins)).toBeNull();
  });
});

describe("webhook secret", () => {
  it("accepts only the exact secret header", () => {
    expect(isWebhookAuthentic(new Headers({ [SECRET_HEADER]: "s3cret" }), "s3cret")).toBe(true);
    expect(isWebhookAuthentic(new Headers({ [SECRET_HEADER]: "s3cre" }), "s3cret")).toBe(false);
    expect(isWebhookAuthentic(new Headers(), "s3cret")).toBe(false);
    expect(isWebhookAuthentic(new Headers({ [SECRET_HEADER]: "" }), "")).toBe(false);
  });
});
