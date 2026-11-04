import { describe, expect, it } from "vitest";
import { planCheckout } from "../src/checkout/plan.ts";
import { HttpError } from "../src/http/errors.ts";
import { CATALOG, MAP, SITE } from "./fixtures.ts";

const context = { catalog: CATALOG, map: MAP, siteUrl: SITE };

describe("planCheckout", () => {
  it("sells the flagship in dollars on the English site and returns to its page", () => {
    const { body, record } = planCheckout({ kind: "product", id: "b51", lang: "en" }, context);
    expect(body.products).toEqual(["p-b51"]);
    expect(body.currency).toBe("usd");
    expect(body.prices).toBeUndefined();
    expect(body.success_url).toBe(`${SITE}/#thanks-{CHECKOUT_ID}`);
    expect(body.return_url).toBe(`${SITE}/#buy-b51`);
    expect(record).toMatchObject({ currency: "usd", amount: 200, itemIds: ["b51"] });
  });
  it("sells the flagship in shekels on the Hebrew site under /he", () => {
    const { body } = planCheckout({ kind: "product", id: "b51", lang: "he" }, context);
    expect(body.currency).toBe("ils");
    expect(body.success_url).toBe(`${SITE}/he/#thanks-{CHECKOUT_ID}`);
    expect(body.locale).toBe("he");
  });
  it("sells a one-item cart as that item's own product", () => {
    const { body, record } = planCheckout({ kind: "cart", ids: ["c1"], lang: "fr" }, context);
    expect(body).toMatchObject({ products: ["p-c1"], currency: "ils", return_url: `${SITE}/fr/#checkout` });
    expect(record).toMatchObject({ kind: "cart", amount: 34900 });
  });
  it("sells a multi-item cart as one store order at the server total with the book deal", () => {
    const { body, record } = planCheckout({ kind: "cart", ids: ["b9", "b10", "b11"], lang: "he" }, context);
    expect(body.products).toEqual(["p-store"]);
    expect(body.prices).toEqual({ "p-store": [{ amount_type: "fixed", price_amount: 8400, price_currency: "ils", tax_behavior: "inclusive" }] });
    expect(body.metadata).toEqual({ ymd_source: "site", ymd_kind: "cart", ymd_ids: "b9,b10,b11", ymd_lang: "he" });
    expect(body.allow_discount_codes).toBe(false);
    expect(record.amount).toBe(8400);
  });
  it("sells a weekly plan in dollars abroad and a monthly plan in shekels", () => {
    expect(planCheckout({ kind: "plan", id: "grow", lang: "en" }, context).body).toMatchObject({ products: ["p-grow"], currency: "usd", return_url: `${SITE}/#buy-plan-grow` });
    expect(planCheckout({ kind: "plan", id: "day", lang: "en" }, context).body).toMatchObject({ products: ["p-day"], currency: "ils" });
  });
  it("refuses to sell when the site price differs from the Polar price", () => {
    const drifted = { ...context, catalog: { ...CATALOG, products: { ...CATALOG.products, b9: { ...CATALOG.products.b9!, price: 50 } } } };
    expect(() => planCheckout({ kind: "product", id: "b9", lang: "he" }, drifted)).toThrow(HttpError);
    const { "store-order": _store, ...noStore } = MAP;
    expect(() => planCheckout({ kind: "cart", ids: ["b9", "b10"], lang: "he" }, { ...context, map: noStore })).toThrow(/not on Polar/);
  });
});
