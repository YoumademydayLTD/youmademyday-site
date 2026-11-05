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
  refundDays: 14,
  business: { en: { name: "You Made My Day Ltd.", id: "Company no. 1", addr: "Haifa", email: "a@b.c" }, he: { name: "עשית לי את היום בע״מ", id: "ח.פ. 1", addr: "חיפה", email: "a@b.c" } },
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
    grow: { title: "grow", titles: { en: "Growth membership", he: "מנוי צמיחה" }, description: "", price: 147, usd: 39, period: "week", trialDays: 1 },
    max: { title: "max", titles: { en: "Maximum membership", he: "מנוי מקסימום" }, description: "", price: 297, usd: 79, period: "week", trialDays: 1 },
    day: { title: "day", titles: { en: "Good Day membership" }, description: "", price: 29, period: "month", trialDays: 0 },
    edit: { title: "edit", titles: { en: "The AI Editing Studio", he: "סטודיו העריכה" }, description: "a course", price: 129, period: "week", trialDays: 1, describeOnCheckout: true },
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
  "plan-max": { ...one("p-max", 29700, 7900), recurring: "week" },
  "plan-day": { ...one("p-day", 2900), recurring: "month" },
  "plan-edit": { ...one("p-edit", 12900), recurring: "week" },
  k49: one("p-k49", 9900),
  "store-order": one("p-store", 10000),
};

export const SITE = "https://youmademyday.store";
