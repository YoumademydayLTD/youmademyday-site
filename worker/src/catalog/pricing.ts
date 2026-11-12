// Price and currency rules, mirrored from the site (site/js/money.js and totals() in site/js/catalog.js).
import type { Currency, CurrencyPrices } from "./types.ts";

export interface Priced { price: number; usd?: number; prices?: CurrencyPrices }
export const HOME_CURRENCY: Currency = "ils";
const MINOR_UNITS = 100;
// Items counted by the "3 books, the cheapest free" deal: e-books and printable templates (site isPdf()).
const BOOK_TYPES = new Set(["ebook", "template"]);

export const toMinor = (major: number): number => Math.round(major * MINOR_UNITS);
export const isDirectOffer = (item: Priced): boolean => item.usd != null;
export const isBook = (item: { type: string }): boolean => BOOK_TYPES.has(item.type);

/** An item's price in a currency, in major units, if it has one. Shekels are its own price; an older dollar price counts too. */
export function priceIn(item: Priced, currency: Currency): number | undefined {
  if (currency === HOME_CURRENCY) return item.price;
  return item.prices?.[currency] ?? (currency === "usd" ? item.usd : undefined);
}

/**
 * What one item is charged. The home-currency site always charges shekels. Another site is charged in the currency
 * it names (`wanted`, sent since 12.11.2026); a page that names none keeps the earlier rule: dollars for items with a
 * dollar price, shekels for the rest. An item with no price in the currency is charged in shekels.
 */
export function currencyFor(lang: string, item: Priced, homeCurrencyLang: string, wanted?: Currency): { currency: Currency; amount: number } {
  if (lang === homeCurrencyLang) return { currency: HOME_CURRENCY, amount: item.price };
  const currency = wanted ?? (item.usd != null ? "usd" : HOME_CURRENCY);
  const amount = priceIn(item, currency);
  return amount === undefined ? { currency: HOME_CURRENCY, amount: item.price } : { currency, amount };
}

/** The one currency a whole cart is charged in: the wanted one when every item has a price in it, else shekels. */
export function cartCurrency(items: Priced[], lang: string, homeCurrencyLang: string, wanted?: Currency): Currency {
  if (lang === homeCurrencyLang || wanted === undefined) return HOME_CURRENCY;
  return items.every((item) => priceIn(item, wanted) !== undefined) ? wanted : HOME_CURRENCY;
}

/** Cart totals in one currency (shekels by default): with dealMin or more books in the cart, the cheapest book is free. */
export function cartTotal(items: (Priced & { type: string })[], dealMin: number, currency: Currency = HOME_CURRENCY): { subtotal: number; bookDeal: number; total: number } {
  const amountOf = (item: Priced): number => {
    const amount = priceIn(item, currency);
    if (amount === undefined) throw new Error(`a cart item has no ${currency} price`);
    return amount;
  };
  const subtotal = items.reduce((sum, item) => sum + amountOf(item), 0);
  const books = items.filter(isBook);
  const bookDeal = books.length >= dealMin ? Math.min(...books.map(amountOf)) : 0;
  return { subtotal, bookDeal, total: subtotal - bookDeal };
}
