import { describe, expect, it } from "vitest";
import { cartCurrency, cartTotal, currencyFor, priceIn, toMinor } from "../src/catalog/pricing.ts";

const HOME = "he";
const book = (price: number) => ({ type: "ebook", price });

describe("currencyFor", () => {
  it("charges shekels on the Hebrew site, even for items with a dollar price", () => {
    expect(currencyFor("he", { price: 5, usd: 2 }, HOME)).toEqual({ currency: "ils", amount: 5 });
  });
  it("charges dollars on other sites for items with a dollar price", () => {
    for (const lang of ["en", "fr", "ar", "ru"]) expect(currencyFor(lang, { price: 147, usd: 39 }, HOME)).toEqual({ currency: "usd", amount: 39 });
  });
  it("charges shekels on other sites for items without a dollar price", () => {
    expect(currencyFor("en", { price: 45 }, HOME)).toEqual({ currency: "ils", amount: 45 });
  });
});

describe("currencyFor with the currency the site names", () => {
  const item = { price: 45, prices: { usd: 14, cad: 20 } };
  it("charges the named currency at the item's own price in it", () => {
    expect(currencyFor("en", item, HOME, "cad")).toEqual({ currency: "cad", amount: 20 });
    expect(currencyFor("fr", item, HOME, "ils")).toEqual({ currency: "ils", amount: 45 });
  });
  it("keeps the Hebrew site in shekels whatever is named", () => {
    expect(currencyFor("he", item, HOME, "cad")).toEqual({ currency: "ils", amount: 45 });
  });
  it("falls back to shekels for an item with no price in the named currency", () => {
    expect(currencyFor("en", item, HOME, "gbp")).toEqual({ currency: "ils", amount: 45 });
  });
  it("reads an older dollar price as the dollar price", () => {
    expect(priceIn({ price: 5, usd: 2 }, "usd")).toBe(2);
    expect(priceIn({ price: 5, usd: 2, prices: { usd: 3 } }, "usd")).toBe(3);
    expect(priceIn({ price: 5 }, "eur")).toBeUndefined();
  });
});

describe("cartCurrency", () => {
  const priced = { price: 45, prices: { cad: 20 } };
  it("is the named currency only when every item has a price in it", () => {
    expect(cartCurrency([priced, priced], "en", HOME, "cad")).toBe("cad");
    expect(cartCurrency([priced, { price: 29 }], "en", HOME, "cad")).toBe("ils");
  });
  it("is shekels on the Hebrew site and when no currency is named", () => {
    expect(cartCurrency([priced], "he", HOME, "cad")).toBe("ils");
    expect(cartCurrency([priced], "en", HOME)).toBe("ils");
  });
});

describe("cartTotal", () => {
  it("totals a cart in another currency, with the deal on the cheapest book in that currency", () => {
    const cadBook = (price: number, cad: number) => ({ type: "ebook", price, prices: { cad } });
    expect(cartTotal([cadBook(45, 20), cadBook(29, 13), cadBook(39, 18)], 3, "cad")).toEqual({ subtotal: 51, bookDeal: 13, total: 38 });
  });
  it("refuses to total a cart with an item that has no price in the currency", () => {
    expect(() => cartTotal([book(45)], 3, "cad")).toThrow(/no cad price/);
  });
  it("has no deal under three books", () => {
    expect(cartTotal([book(45), book(39)], 3)).toEqual({ subtotal: 84, bookDeal: 0, total: 84 });
  });
  it("makes the cheapest book free from three books", () => {
    expect(cartTotal([book(45), book(29), book(39)], 3)).toEqual({ subtotal: 113, bookDeal: 29, total: 84 });
  });
  it("counts templates as books but not courses or bundles", () => {
    const items = [{ type: "course", price: 10 }, { type: "bundle", price: 20 }, { type: "template", price: 35 }, book(45)];
    expect(cartTotal(items, 3).bookDeal).toBe(0);
    expect(cartTotal([...items, book(25)], 3)).toEqual({ subtotal: 135, bookDeal: 25, total: 110 });
  });
  it("frees only one book when several share the lowest price", () => {
    expect(cartTotal([book(35), book(35), book(35), book(35)], 3)).toEqual({ subtotal: 140, bookDeal: 35, total: 105 });
  });
  it("is zero for an empty cart", () => {
    expect(cartTotal([], 3)).toEqual({ subtotal: 0, bookDeal: 0, total: 0 });
  });
});

describe("toMinor", () => {
  it("converts to agorot / cents without float noise", () => {
    expect(toMinor(147)).toBe(14700);
    expect(toMinor(19.99)).toBe(1999);
  });
});
