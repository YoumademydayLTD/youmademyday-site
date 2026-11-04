// A small catalogue and Polar mapping shaped like the generated ones.
import type { Catalog, CatalogProduct } from "../src/catalog/index.ts";
import type { ProductMap } from "../src/polar/mapping.ts";

function product(n: number, type: string, title: string, price: number, langs: string[]): CatalogProduct {
  return { n, type, title, description: "", price, langs, titles: Object.fromEntries(langs.map((l) => [l, `${title} (${l})`])) };
}

export const CATALOG: Catalog = {
  langs: ["en", "he", "fr"],
  defaultLang: "en",
  homeCurrencyLang: "he",
  bookDealMin: 3,
  products: {
    b9: product(9, "ebook", "a", 45, ["en", "he", "fr"]),
    b10: product(10, "ebook", "b", 29, ["en", "he", "fr"]),
    b11: product(11, "ebook", "c", 39, ["en", "he", "fr"]),
    b44: product(44, "ebook", "he only", 45, ["he", "fr"]),
    c1: product(1, "course", "course", 349, ["en", "he", "fr"]),
    b51: { ...product(51, "ebook", "flagship", 5, ["en", "he", "fr"]), usd: 2 },
    k49: { ...product(49, "bundle", "bundle", 99, ["en", "he", "fr"]), includes: ["b9", "b10"] },
  },
  plans: {
    grow: { title: "grow", description: "", price: 147, usd: 39, period: "week", trialDays: 1 },
    day: { title: "day", description: "", price: 29, period: "month", trialDays: 0 },
  },
};

const one = (productId: string, ils: number, usd?: number) => ({
  productId, recurring: null,
  prices: { ils: { id: `${productId}-ils`, amount: ils }, ...(usd === undefined ? {} : { usd: { id: `${productId}-usd`, amount: usd } }) },
});

export const MAP: ProductMap = {
  b9: one("p-b9", 4500),
  b10: one("p-b10", 2900),
  b11: one("p-b11", 3900),
  b44: one("p-b44", 4500),
  c1: one("p-c1", 34900),
  b51: one("p-b51", 500, 200),
  "plan-grow": { ...one("p-grow", 14700, 3900), recurring: "week" },
  "plan-day": { ...one("p-day", 2900), recurring: "month" },
  k49: one("p-k49", 9900),
  "store-order": one("p-store", 10000),
};

export const SITE = "https://youmademyday.store";
