import { describe, expect, it } from "vitest";
import { buildCatalog } from "../../tools/build_catalog.ts";
import { productSpecs } from "../../tools/polar/specs.ts";

describe("productSpecs", () => {
  it("gives every product and paid plan one price per store currency, shekels first", async () => {
    const catalog = await buildCatalog();
    const specs = productSpecs(catalog).filter((spec) => spec.ymdId !== "store-order");
    for (const spec of specs) {
      expect(spec.prices.map((p) => p.currency), spec.ymdId).toEqual(catalog.currencies);
      for (const price of spec.prices) expect(Number.isInteger(price.amount) && price.amount > 0, `${spec.ymdId} ${price.currency}`).toBe(true);
    }
  });
  it("keeps the dollar prices that existed before the other currencies were added", async () => {
    const byId = new Map(productSpecs(await buildCatalog()).map((spec) => [spec.ymdId, spec]));
    const usdOf = (id: string): number | undefined => byId.get(id)?.prices.find((p) => p.currency === "usd")?.amount;
    expect(usdOf("b51")).toBe(200);
    expect(usdOf("plan-grow")).toBe(3900);
    expect(usdOf("plan-max")).toBe(7900);
  });
});
