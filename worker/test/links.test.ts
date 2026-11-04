import { describe, expect, it } from "vitest";
import { MAX_CALLER_KEYS, parseLinkRequest } from "../src/links/request.ts";
import { planLink } from "../src/links/plan.ts";
import { assertAuthorized } from "../src/links/handler.ts";
import { MAP } from "./fixtures.ts";

describe("parseLinkRequest", () => {
  it("reads a custom price in currency units and the caller's metadata", () => {
    expect(parseLinkRequest({ product: "b51", amount: 5, metadata: { customer: "c-42", step: 3 } }, MAP))
      .toEqual({ storeId: "b51", currency: "ils", amount: 500, metadata: { customer: "c-42", step: "3" } });
  });
  it("rejects bad products, currencies and amounts", () => {
    expect(() => parseLinkRequest({ product: "nope" }, MAP)).toThrow(/unknown product/);
    expect(() => parseLinkRequest({ product: "b51", currency: "eur" }, MAP)).toThrow(/currency/);
    expect(() => parseLinkRequest({ product: "b51", amount: 0 }, MAP)).toThrow(/amount/);
    expect(() => parseLinkRequest({ product: "b51", amount: "5" }, MAP)).toThrow(/amount/);
    expect(() => parseLinkRequest({ product: "b51", amount: 1.234 }, MAP)).toThrow(/decimals/);
  });
  it("rejects reserved, long and too many metadata keys", () => {
    expect(() => parseLinkRequest({ product: "b51", metadata: { ymd_ids: "x" } }, MAP)).toThrow(/reserved/);
    expect(() => parseLinkRequest({ product: "b51", metadata: { k: "x".repeat(501) } }, MAP)).toThrow(/longer/);
    const many = Object.fromEntries(Array.from({ length: MAX_CALLER_KEYS + 1 }, (_, i) => [`k${i}`, "v"]));
    expect(() => parseLinkRequest({ product: "b51", metadata: many }, MAP)).toThrow(/more than/);
    expect(() => parseLinkRequest({ product: "b51", metadata: { k: { nested: 1 } } }, MAP)).toThrow(/string/);
  });
});

describe("planLink", () => {
  it("uses an ad-hoc price, keeps the caller's metadata and sets no success_url", () => {
    const { body, amount } = planLink({ storeId: "b51", currency: "ils", amount: 500, metadata: { customer: "c-42" }, externalCustomerId: "c-42" }, MAP);
    expect(body.success_url).toBeUndefined();
    expect(body.prices).toEqual({ "p-b51": [{ amount_type: "fixed", price_amount: 500, price_currency: "ils", tax_behavior: "inclusive" }] });
    expect(body.metadata).toEqual({ customer: "c-42", ymd_source: "crx", ymd_kind: "link", ymd_ids: "b51" });
    expect(body.external_customer_id).toBe("c-42");
    expect(amount).toBe(500);
  });
  it("uses the catalogue price when no amount is sent, and needs one for a missing currency", () => {
    const { body, amount } = planLink({ storeId: "b9", currency: "ils", metadata: {} }, MAP);
    expect(body.prices).toBeUndefined();
    expect(amount).toBe(4500);
    expect(() => planLink({ storeId: "b9", currency: "usd", metadata: {} }, MAP)).toThrow(/no usd price/);
  });
});

describe("assertAuthorized", () => {
  it("lets the right bearer secret in and keeps everyone else out", () => {
    expect(() => assertAuthorized("Bearer s3cret", "s3cret")).not.toThrow();
    expect(() => assertAuthorized("Bearer wrong", "s3cret")).toThrow();
    expect(() => assertAuthorized("s3cret", "s3cret")).toThrow();
    expect(() => assertAuthorized(null, "s3cret")).toThrow();
    expect(() => assertAuthorized("Bearer ", "")).toThrow();
  });
});
