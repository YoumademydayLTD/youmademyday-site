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
  it("sells a weekly link plan with no description, at 47 or 97 CAD a week after a free day", async () => {
    const byId = new Map(productSpecs(await buildCatalog()).map((spec) => [spec.ymdId, spec]));
    const cadOf = (id: string): number | undefined => byId.get(id)?.prices.find((p) => p.currency === "cad")?.amount;
    expect(byId.get("plan-ai")).toMatchObject({ description: null, visibility: "public", recurring: "week", trialDays: 1 });
    expect(byId.get("plan-library")).toMatchObject({ description: null, recurring: "week", trialDays: 1 });
    expect(cadOf("plan-ai")).toBe(4700);
    expect(cadOf("plan-library")).toBe(9700);
    const weeklyAt47 = [...byId.values()].filter((spec) => spec.recurring === "week" && spec.trialDays === 1 && spec.prices.some((p) => p.currency === "cad" && p.amount === 4700));
    expect(weeklyAt47).toHaveLength(11);
  });
  // Owner, 13.11.2026: the payment page names only the kind of thing bought.
  it("names every plan «Subscription» and every one-dollar short guide «Book» on the payment page", async () => {
    const specs = productSpecs(await buildCatalog());
    const plans = specs.filter((spec) => spec.ymdId.startsWith("plan-"));
    expect(plans.length).toBeGreaterThan(12);
    expect(new Set(plans.map((spec) => spec.name))).toEqual(new Set(["Subscription"]));
    const guides = specs.filter((spec) => /^b(5[3-9]|6\d|7[0-6])$/.test(spec.ymdId));
    expect(guides).toHaveLength(24);
    expect(new Set(guides.map((spec) => spec.name))).toEqual(new Set(["Book"]));
  });
  it("keeps the title of every other product", async () => {
    const byId = new Map(productSpecs(await buildCatalog()).map((spec) => [spec.ymdId, spec]));
    expect(byId.get("b9")?.name).toBe("מדריך הפרומפטים בעברית");
    expect(byId.get("b52")?.name).not.toBe("Book");
  });
});
