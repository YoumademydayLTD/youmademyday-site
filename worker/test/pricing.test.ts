import { describe, expect, it } from "vitest";
import { cartTotal, currencyFor, toMinor } from "../src/catalog/pricing.ts";

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

describe("cartTotal", () => {
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
