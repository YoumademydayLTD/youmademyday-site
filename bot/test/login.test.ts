import { describe, expect, it } from "vitest";
import { confirmLink, isThrottled, isValidCode, linkState, LOGIN_TTL_SECONDS, MAX_FAILED_CODES, newCode, newLink, redeemCode } from "../src/login/lifecycle.ts";
import { randomDigits } from "../src/http/crypto.ts";

const NOW = 1_800_000_000;
const USER = 42;

describe("deep-link login", () => {
  it("is pending until confirmed, then ready once", () => {
    const link = newLink("token", "site", NOW);
    expect(linkState(link, "site", NOW)).toEqual({ status: "pending" });
    const confirmed = confirmLink(link, USER, NOW + 10);
    expect(confirmed).not.toBeNull();
    expect(linkState(confirmed, "site", NOW + 11)).toEqual({ status: "ready", telegramId: USER });
    expect(linkState(confirmed && { ...confirmed, status: "used" }, "site", NOW + 12)).toEqual({ status: "expired" });
  });

  it("expires after 5 minutes and cannot be confirmed late or twice", () => {
    const link = newLink("token", "site", NOW);
    expect(linkState(link, "site", NOW + LOGIN_TTL_SECONDS)).toEqual({ status: "expired" });
    expect(confirmLink(link, USER, NOW + LOGIN_TTL_SECONDS)).toBeNull();
    const confirmed = confirmLink(link, USER, NOW);
    expect(confirmed && confirmLink(confirmed, 7, NOW)).toBeNull();
    expect(linkState(null, "site", NOW)).toEqual({ status: "expired" });
  });
});

describe("link scope", () => {
  it("never lets a site link open the support center, or the reverse", () => {
    const site = confirmLink(newLink("t", "site", NOW), USER, NOW);
    const admin = confirmLink(newLink("t", "admin", NOW), USER, NOW);
    expect(linkState(site, "admin", NOW)).toEqual({ status: "expired" });
    expect(linkState(admin, "site", NOW)).toEqual({ status: "expired" });
    expect(linkState(admin, "admin", NOW)).toEqual({ status: "ready", telegramId: USER });
  });
});

describe("6-digit code", () => {
  it("signs in its user within 5 minutes", () => {
    const code = newCode("123456", USER, NOW);
    expect(redeemCode(code, NOW + LOGIN_TTL_SECONDS - 1)).toBe(USER);
    expect(redeemCode(code, NOW + LOGIN_TTL_SECONDS)).toBeNull();
  });

  it("works once", () => {
    const code = newCode("123456", USER, NOW);
    expect(redeemCode({ ...code, status: "used" }, NOW)).toBeNull();
    expect(redeemCode(null, NOW)).toBeNull();
    expect(redeemCode(newLink("x", "site", NOW), NOW)).toBeNull();
  });

  it("accepts only six digits, and random codes are six digits", () => {
    expect(isValidCode("012345")).toBe(true);
    for (const bad of ["12345", "1234567", "12a456", " 123456"]) expect(isValidCode(bad)).toBe(false);
    for (let i = 0; i < 50; i += 1) expect(isValidCode(randomDigits(6))).toBe(true);
  });

  it("throttles after too many wrong codes", () => {
    expect(isThrottled(MAX_FAILED_CODES - 1)).toBe(false);
    expect(isThrottled(MAX_FAILED_CODES)).toBe(true);
  });
});
