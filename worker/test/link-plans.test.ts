// The weekly link plans against the real bundled catalogue: what each opens exists, differs, and is priced as decided.
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog/index.ts";
import { LIBRARY_LINK_PLAN, LINK_PLAN_ITEMS } from "../src/catalog/link-plans.ts";
import { includedProducts } from "../src/view/plan-library.ts";
import { planLink } from "../src/links/plan.ts";
import { CATALOG as FIXTURE_CATALOG, MAP } from "./fixtures.ts";

const STUDIO_IDS = Object.keys(LINK_PLAN_ITEMS);
const STUDIO_CAD = 47;
const LIBRARY_CAD = 97;
const MAX_NAME_LENGTH = 20;
const sellable = Object.entries(CATALOG.products).filter(([, p]) => !p.includes).map(([id]) => id);

describe("the eleven weekly link plans", () => {
  it("are eleven catalogue plans: weekly, first day free, 47 CAD, a short plain payment-page name", () => {
    expect(STUDIO_IDS).toHaveLength(11);
    const names = new Set<string>();
    for (const id of STUDIO_IDS) {
      const plan = CATALOG.plans[id];
      expect(plan, id).toBeDefined();
      expect(plan?.period, id).toBe("week");
      expect(plan?.trialDays, id).toBe(1);
      expect(plan?.prices?.cad, id).toBe(STUDIO_CAD);
      expect(plan?.checkoutName, id).toMatch(/^[A-Za-z ]+$/);
      expect((plan?.checkoutName ?? "").length, id).toBeLessThanOrEqual(MAX_NAME_LENGTH);
      expect(plan?.describeOnCheckout, id).toBeUndefined();
      names.add(plan?.checkoutName ?? "");
    }
    expect(names.size).toBe(STUDIO_IDS.length);
  });
  it("each open real items that the English site sells too", () => {
    for (const [id, items] of Object.entries(LINK_PLAN_ITEMS)) {
      expect(items.length, id).toBeGreaterThanOrEqual(3);
      for (const item of items) {
        expect(CATALOG.products[item], `${id} ${item}`).toBeDefined();
        expect(CATALOG.products[item]?.includes, `${id} ${item}`).toBeUndefined();
        expect(CATALOG.products[item]?.langs, `${id} ${item}`).toContain("en");
      }
      expect([...includedProducts([id], CATALOG)].sort(), id).toEqual([...items].sort());
    }
  });
  it("share no item, so two of them are never the same thing", () => {
    const all = Object.values(LINK_PLAN_ITEMS).flat();
    expect(new Set(all).size).toBe(all.length);
  });
  it("add up for a buyer who holds several", () => {
    const both = includedProducts(["ai", "calm"], CATALOG);
    expect([...both].sort()).toEqual([...(LINK_PLAN_ITEMS.ai ?? []), ...(LINK_PLAN_ITEMS.calm ?? [])].sort());
  });
});

describe("the weekly library link plan", () => {
  it("is weekly at 97 CAD with the first day free, and opens every course and book", () => {
    const plan = CATALOG.plans[LIBRARY_LINK_PLAN];
    expect(plan).toMatchObject({ period: "week", trialDays: 1, checkoutName: "Full Library" });
    expect(plan?.prices?.cad).toBe(LIBRARY_CAD);
    expect([...includedProducts([LIBRARY_LINK_PLAN], CATALOG)].sort()).toEqual([...sellable].sort());
  });
});

describe("the plans that were sold before", () => {
  it("keep their prices and what they open", () => {
    expect(CATALOG.plans.max).toMatchObject({ price: 297, usd: 79, prices: { cad: 109 }, period: "week", trialDays: 1 });
    expect(CATALOG.plans.edit).toMatchObject({ title: "עריכה", price: 129, prices: { cad: 59 }, period: "week", trialDays: 1 });
    expect(CATALOG.plans.edit?.checkoutName).toBeUndefined();
    expect(CATALOG.plans.max?.checkoutName).toBeUndefined();
    expect([...includedProducts(["edit"], CATALOG)].sort()).toEqual(["b28", "b29", "c2", "c5"]);
    expect(includedProducts(["max"], CATALOG).size).toBe(sellable.length);
  });
});

describe("a link for a weekly link plan", () => {
  it("charges the catalogue price in CAD (no ad-hoc price) with the free day on the checkout", () => {
    const { body, amount, productId, itemIds } = planLink({ storeId: "plan-ai", currency: "cad", metadata: { ref: "r-1" }, lang: "en" }, { map: MAP, catalog: FIXTURE_CATALOG, buyerYm: "ym0042" });
    expect(amount).toBe(4700);
    expect(productId).toBe("p-ai");
    expect(itemIds).toEqual(["ai"]);
    expect(body.prices).toBeUndefined();
    expect(body).toMatchObject({
      products: ["p-ai"], currency: "cad", trial_interval: "day", trial_interval_count: 1, locale: "en", external_customer_id: "ym0042", allow_discount_codes: false,
      metadata: { ref: "r-1", ymd_source: "crx", ymd_kind: "link", ymd_ids: "ai", ymd_customer: "ym0042" },
    });
    expect(body.success_url).toBeUndefined();
  });
  it("needs an amount in a currency the plan has no price in", () => {
    expect(() => planLink({ storeId: "plan-ai", currency: "gel", metadata: {} }, { map: MAP, catalog: FIXTURE_CATALOG })).toThrow(/no gel price/);
  });
});
