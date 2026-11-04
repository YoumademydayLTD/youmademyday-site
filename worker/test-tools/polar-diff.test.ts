import { describe, expect, it } from "vitest";
import { diffProduct, mapProduct, type PolarProduct } from "../../tools/polar/diff.ts";
import type { ProductSpec } from "../../tools/polar/specs.ts";

const spec: ProductSpec = { ymdId: "b51", name: "Book", description: "d", visibility: "public", recurring: null, trialDays: 0,
  prices: [{ currency: "ils", amount: 500 }, { currency: "usd", amount: 200 }] };
const price = (id: string, currency: string, amount: number, extra: Partial<{ is_archived: boolean; tax_behavior: string | null }> = {}) =>
  ({ id, amount_type: "fixed", price_currency: currency, price_amount: amount, tax_behavior: "inclusive", is_archived: false, ...extra });
const existing = (over: Partial<PolarProduct> = {}): PolarProduct => ({
  id: "p1", name: "Book", description: "d", visibility: "public", is_archived: false, recurring_interval: null, trial_interval: null, trial_interval_count: null,
  metadata: { ymd_id: "b51" }, prices: [price("i", "ils", 500), price("u", "usd", 200)], ...over,
});

describe("diffProduct", () => {
  it("creates a missing product with tax-inclusive prices and its ymd_id", () => {
    const action = diffProduct(spec, undefined);
    expect(action.kind).toBe("create");
    if (action.kind === "create") expect(action.body).toMatchObject({ metadata: { ymd_id: "b51" }, prices: [{ price_currency: "ils", price_amount: 500, tax_behavior: "inclusive" }, { price_currency: "usd" }] });
  });
  it("does nothing when Polar already matches", () => {
    expect(diffProduct(spec, existing())).toEqual({ kind: "same", id: "p1" });
  });
  it("keeps unchanged prices by id and adds only the changed one", () => {
    const action = diffProduct({ ...spec, prices: [{ currency: "ils", amount: 600 }, { currency: "usd", amount: 200 }] }, existing());
    expect(action).toMatchObject({ kind: "update", changed: ["prices"] });
    if (action.kind === "update") expect(action.body.prices).toEqual([{ amount_type: "fixed", price_amount: 600, price_currency: "ils", tax_behavior: "inclusive" }, { id: "u" }]);
  });
  it("replaces a price whose tax behavior is not inclusive", () => {
    const action = diffProduct(spec, existing({ prices: [price("i", "ils", 500, { tax_behavior: null }), price("u", "usd", 200)] }));
    expect(action.kind).toBe("update");
  });
  it("sets the trial on a weekly plan", () => {
    const plan: ProductSpec = { ...spec, recurring: "week", trialDays: 1 };
    const action = diffProduct(plan, existing({ recurring_interval: "week" }));
    expect(action).toMatchObject({ kind: "update", body: { trial_interval: "day", trial_interval_count: 1 } });
    expect(diffProduct(plan, existing({ recurring_interval: "week", trial_interval: "day", trial_interval_count: 1 })).kind).toBe("same");
  });
  it("refuses interval changes and archived products", () => {
    expect(diffProduct({ ...spec, recurring: "month" }, existing()).kind).toBe("error");
    expect(diffProduct(spec, existing({ is_archived: true })).kind).toBe("error");
  });
});

describe("mapProduct", () => {
  it("maps each currency to its active matching price", () => {
    expect(mapProduct(spec, existing({ prices: [price("old", "ils", 500, { is_archived: true }), price("i", "ils", 500), price("u", "usd", 200)] })))
      .toEqual({ productId: "p1", recurring: null, prices: { ils: { id: "i", amount: 500 }, usd: { id: "u", amount: 200 } } });
  });
  it("fails when a wanted price is missing", () => {
    expect(() => mapProduct(spec, existing({ prices: [price("i", "ils", 500)] }))).toThrow(/no active usd price/);
  });
});
