// A small catalogue and Polar mapping shaped like the generated ones.
import type { Catalog } from "../src/catalog/index.ts";
import type { ProductMap } from "../src/polar/mapping.ts";

export const CATALOG: Catalog = {
  langs: ["en", "he", "fr"],
  defaultLang: "en",
  homeCurrencyLang: "he",
  bookDealMin: 3,
  products: {
    b9: { type: "ebook", title: "a", description: "", price: 45, langs: ["en", "he", "fr"] },
    b10: { type: "ebook", title: "b", description: "", price: 29, langs: ["en", "he", "fr"] },
    b11: { type: "ebook", title: "c", description: "", price: 39, langs: ["en", "he", "fr"] },
    b44: { type: "ebook", title: "he only", description: "", price: 45, langs: ["he", "fr"] },
    c1: { type: "course", title: "course", description: "", price: 349, langs: ["en", "he", "fr"] },
    b51: { type: "ebook", title: "flagship", description: "", price: 5, usd: 2, langs: ["en", "he", "fr"] },
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
  "store-order": one("p-store", 10000),
};

export const SITE = "https://youmademyday.store";
