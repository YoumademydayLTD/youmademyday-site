import { describe, expect, it } from "vitest";
import { buildPayload, MAX_PAYLOAD_LENGTH, parsePayload, parseStartText } from "../src/start/payload.ts";
import { randomToken } from "../src/http/crypto.ts";

const CHECKOUT = "0b5a8f5e-3f0c-4b7e-9d1a-2c3b4d5e6f70";

describe("start payloads", () => {
  it("reads the site's payloads", () => {
    expect(parsePayload("home")).toEqual({ kind: "home" });
    expect(parsePayload("support")).toEqual({ kind: "support" });
    expect(parsePayload("plan-spark")).toEqual({ kind: "plan", planId: "spark" });
    expect(parsePayload(`order-${CHECKOUT}`)).toEqual({ kind: "order", checkoutId: CHECKOUT });
    expect(parsePayload(`order-${CHECKOUT.toUpperCase()}`)).toEqual({ kind: "order", checkoutId: CHECKOUT });
    expect(parsePayload("login-abcdefghijklmnop_-12")).toEqual({ kind: "login", token: "abcdefghijklmnop_-12" });
  });

  it("falls back to the menu for anything else", () => {
    for (const bad of ["", "order-123", "plan-", "plan-Spark!", "login-short", "x".repeat(MAX_PAYLOAD_LENGTH + 1), "home now", "unknown"]) {
      expect(parsePayload(bad)).toEqual({ kind: "menu" });
    }
  });

  it("parses the /start message text", () => {
    expect(parseStartText("/start")).toEqual({ kind: "menu" });
    expect(parseStartText("/start support")).toEqual({ kind: "support" });
    expect(parseStartText("hello")).toEqual({ kind: "menu" });
  });

  it("keeps generated payloads inside Telegram's 64-character limit", () => {
    const login = buildPayload("login", randomToken());
    expect(login.length).toBeLessThanOrEqual(MAX_PAYLOAD_LENGTH);
    expect(parsePayload(login).kind).toBe("login");
    expect(buildPayload("order", CHECKOUT).length).toBeLessThanOrEqual(MAX_PAYLOAD_LENGTH);
    expect(() => buildPayload("plan", "a b")).toThrow();
  });
});
