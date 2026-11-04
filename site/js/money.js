// Prices per site language. Most items have one shekel price on every site; a "direct offer" (the flagship
// book, the weekly memberships) also has a dollar price, shown on the foreign sites (owner, 04.11.2026).
// Direct offers are bought alone on their own checkout page, so a cart never mixes currencies.
import { LANG, L } from "./i18n/index.js";
import { HOME_CURRENCY_LANG } from "./i18n/config.js";

const formatters = {};

/** Format an amount in a currency for the active language, without decimals for whole amounts. */
export function formatMoney(amount, currency) {
  formatters[currency] ??= new Intl.NumberFormat(L.locale, { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 });
  return formatters[currency].format(amount);
}

/** True for items that carry their own dollar price and are bought alone. */
export const isDirectOffer = (item) => item.usd != null;

/** The amount and currency this site charges for an item. */
export function priceOf(item) {
  const isDollar = LANG !== HOME_CURRENCY_LANG && isDirectOffer(item);
  return isDollar ? { amount: item.usd, currency: "USD" } : { amount: item.price, currency: "ILS" };
}

export const priceLabel = (item) => {
  const { amount, currency } = priceOf(item);
  return formatMoney(amount, currency);
};

/** Hash of the single-item checkout page for a product or plan. */
export const buyHref = (id) => `#buy-${id}`;
