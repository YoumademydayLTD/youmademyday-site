// The bundled catalogue must match the site's data files; a price edit without regenerating it fails here.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCatalog, CATALOG_PATH, serialize } from "../../tools/build_catalog.ts";
import mapping from "../src/polar/products.json";
import { productSpecs } from "../../tools/polar/specs.ts";

describe("catalog.json", () => {
  it("is up to date with site/js (run npm run catalog)", async () => {
    expect(readFileSync(CATALOG_PATH, "utf8")).toBe(serialize(await buildCatalog()));
  });
  it("has every sellable item on Polar at the same price (run npm run sync)", async () => {
    const map = mapping as Record<string, { prices: Record<string, { amount: number }> }>;
    for (const spec of productSpecs(await buildCatalog())) {
      for (const price of spec.prices) expect(map[spec.ymdId]?.prices[price.currency]?.amount, `${spec.ymdId} ${price.currency}`).toBe(price.amount);
    }
  });
});
