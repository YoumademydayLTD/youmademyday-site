// Price and currency rules, mirrored from the site (site/js/money.js and totals() in site/js/catalog.js).
import type { Currency } from "./types.ts";

export interface Priced { price: number; usd?: number }
const MINOR_UNITS = 100;
// Items counted by the "3 books, the cheapest free" deal: e-books and printable templates (site isPdf()).
const BOOK_TYPES = new Set(["ebook", "template"]);

export const toMinor = (major: number): number => Math.round(major * MINOR_UNITS);
export const isDirectOffer = (item: Priced): boolean => item.usd != null;
export const isBook = (item: { type: string }): boolean => BOOK_TYPES.has(item.type);

/** The home-currency site always charges shekels; the others charge dollars for items that carry a dollar price. */
export function currencyFor(lang: string, item: Priced, homeCurrencyLang: string): { currency: Currency; amount: number } {
  const isDollar = lang !== homeCurrencyLang && item.usd != null;
  return isDollar ? { currency: "usd", amount: item.usd ?? 0 } : { currency: "ils", amount: item.price };
}

/** Cart totals in shekels: with dealMin or more books in the cart, the cheapest book is free. */
export function cartTotal(items: (Priced & { type: string })[], dealMin: number): { subtotal: number; bookDeal: number; total: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const books = items.filter(isBook);
  const bookDeal = books.length >= dealMin ? Math.min(...books.map((b) => b.price)) : 0;
  return { subtotal, bookDeal, total: subtotal - bookDeal };
}
