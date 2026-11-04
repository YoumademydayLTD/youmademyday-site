import { describe, expect, it } from "vitest";
import { MAX_CALLER_KEYS, parseLinkRequest } from "../src/links/request.ts";
import { planLink } from "../src/links/plan.ts";
import { assertAuthorized } from "../src/links/handler.ts";
import { CATALOG, MAP } from "./fixtures.ts";

const CONTEXT = { map: MAP, catalog: CATALOG };

describe("parseLinkRequest", () => {
  it("reads a custom price in currency units and the caller's metadata", () => {
    expect(parseLinkRequest({ product: "b51", amount: 5, metadata: { customer: "c-42", step: 3 } }, MAP))
      .toEqual({ storeId: "b51", currency: "ils", amount: 500, metadata: { customer: "c-42", step: "3" } });
  });
  it("rejects bad products, currencies and amounts", () => {
    expect(() => parseLinkRequest({ product: "nope" }, MAP)).toThrow(/unknown product/);
    expect(() => parseLinkRequest({ product: "b51", currency: "eur" }, MAP)).toThrow(/currency/);
    expect(() => parseLinkRequest({ product: "b51", currency: "GEL" }, MAP)).toThrow(/currency/);
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
    const { body, amount } = planLink({ storeId: "b51", currency: "ils", amount: 500, metadata: { customer: "c-42" }, externalCustomerId: "c-42" }, CONTEXT);
    expect(body.success_url).toBeUndefined();
    expect(body.prices).toEqual({ "p-b51": [{ amount_type: "fixed", price_amount: 500, price_currency: "ils", tax_behavior: "inclusive" }] });
    expect(body.metadata).toEqual({ customer: "c-42", ymd_source: "crx", ymd_kind: "link", ymd_ids: "b51" });
    expect(body.external_customer_id).toBe("c-42");
    expect(amount).toBe(500);
  });
  it("uses the catalogue price when no amount is sent, and needs one for a missing currency", () => {
    const { body, amount } = planLink({ storeId: "b9", currency: "ils", metadata: {} }, CONTEXT);
    expect(body.prices).toBeUndefined();
    expect(amount).toBe(4500);
    expect(() => planLink({ storeId: "b9", currency: "usd", metadata: {} }, CONTEXT)).toThrow(/no usd price/);
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

describe("link billing country", () => {
  it("prefills the caller's country, else the language's, and passes the buyer IP", () => {
    expect(parseLinkRequest({ product: "b51", country: "fr", customer_ip_address: "203.0.113.7" }, MAP)).toMatchObject({ country: "FR", customerIp: "203.0.113.7" });
    expect(parseLinkRequest({ product: "b51", lang: "he" }, MAP).country).toBe("IL");
    expect(parseLinkRequest({ product: "b51" }, MAP).country).toBeUndefined();
    const { body } = planLink({ storeId: "b51", currency: "ils", metadata: {}, country: "IL", customerIp: "1.2.3.4" }, CONTEXT);
    expect(body).toMatchObject({ customer_billing_address: { country: "IL" }, customer_ip_address: "1.2.3.4" });
  });
});

describe("GEL links", () => {
  it("accepts gel and needs an amount for a product without a gel price", () => {
    expect(parseLinkRequest({ product: "b51", currency: "gel", amount: 2 }, MAP)).toMatchObject({ currency: "gel", amount: 200 });
    expect(() => planLink({ storeId: "b51", currency: "gel", metadata: {} }, CONTEXT)).toThrow(/no gel price/);
    const { body } = planLink({ storeId: "b51", currency: "gel", amount: 200, metadata: {} }, CONTEXT);
    expect(body).toMatchObject({ currency: "gel", prices: { "p-b51": [{ amount_type: "fixed", price_amount: 200, price_currency: "gel", tax_behavior: "inclusive" }] } });
    expect(body.trial_interval).toBeUndefined();
  });
  it("still sells the 5 ₪ product at its catalogue price, with no ad-hoc price", () => {
    const { body, amount, itemIds } = planLink({ storeId: "b51", currency: "ils", metadata: {} }, CONTEXT);
    expect(body.prices).toBeUndefined();
    expect(amount).toBe(500);
    expect(itemIds).toEqual(["b51"]);
  });
});

describe("Maximum membership weekly at 100 GEL", () => {
  const plan = () => planLink({ storeId: "plan-max", currency: "gel", metadata: { lead: "L1" } }, { ...CONTEXT, buyerYm: "ym0042" });
  it("charges the link-only 100 GEL as an ad-hoc price on the plan's own weekly product", () => {
    const { body, amount, productId } = plan();
    expect(productId).toBe("p-max");
    expect(amount).toBe(10_000);
    expect(body.products).toEqual(["p-max"]);
    expect(body.prices).toEqual({ "p-max": [{ amount_type: "fixed", price_amount: 10_000, price_currency: "gel", tax_behavior: "inclusive" }] });
  });
  it("starts with the plan's free day, set on the checkout", () => {
    expect(plan().body).toMatchObject({ trial_interval: "day", trial_interval_count: 1 });
    // A monthly plan without a trial gets none.
    expect(planLink({ storeId: "plan-day", currency: "ils", metadata: {} }, CONTEXT).body.trial_interval).toBeUndefined();
  });
  it("records the plan by its plan id, like the site, so invoices name the plan", () => {
    const { body, itemIds } = plan();
    expect(itemIds).toEqual(["max"]);
    expect(body.metadata).toEqual({ lead: "L1", ymd_source: "crx", ymd_kind: "link", ymd_ids: "max", ymd_customer: "ym0042" });
  });
  it("locks the checkout to the store's customer and sets no success_url", () => {
    const { body } = plan();
    expect(body.external_customer_id).toBe("ym0042");
    expect(body.customer_email).toBeUndefined();
    expect(body.success_url).toBeUndefined();
  });
  it("still sells the plan in shekels at its catalogue price", () => {
    const { body, amount } = planLink({ storeId: "plan-max", currency: "ils", metadata: {} }, CONTEXT);
    expect(body.prices).toBeUndefined();
    expect(amount).toBe(29_700);
  });
});

describe("telegram_user_id", () => {
  it("reads a number or a digit string", () => {
    expect(parseLinkRequest({ product: "b51", telegram_user_id: 123456789 }, MAP).telegramUserId).toBe(123456789);
    expect(parseLinkRequest({ product: "b51", telegram_user_id: "987654321" }, MAP).telegramUserId).toBe(987654321);
    expect(parseLinkRequest({ product: "b51" }, MAP).telegramUserId).toBeUndefined();
  });
  it("rejects anything that is not a positive safe integer", () => {
    for (const bad of [0, -5, 1.5, "12a", "0123", "", Number.MAX_SAFE_INTEGER + 2, true, {}]) {
      expect(() => parseLinkRequest({ product: "b51", telegram_user_id: bad }, MAP)).toThrow(/telegram_user_id/);
    }
  });
  it("refuses a second identity next to it", () => {
    expect(() => parseLinkRequest({ product: "b51", telegram_user_id: 5, customer_email: "a@b.c" }, MAP)).toThrow(/not both/);
    expect(() => parseLinkRequest({ product: "b51", telegram_user_id: 5, external_customer_id: "x" }, MAP)).toThrow(/not both/);
  });
});
