// Prices in the visitor's currency (owner, 12.11.2026). Every item has a shekel price and a hand-rounded price in
// each other currency (item.prices, from tools/currency_prices.json). The Hebrew site always shows shekels.
// A "direct offer" (the flagship book, the weekly memberships: items with a `usd` field, owner 04.11.2026) is
// bought alone on its own checkout page; everything else goes through the cart, in the same currency.
import { L, formatPrice } from "./i18n/index.js";
import { HOME_CURRENCY } from "./i18n/config.js";
import { CURRENCY } from "./currency.js";

const formatters = {};

/** Format an amount in a currency for the active language, without decimals for whole amounts. */
export function formatMoney(amount, currency) {
  formatters[currency] ??= new Intl.NumberFormat(L.locale, { style: "currency", currency, maximumFractionDigits: 2, minimumFractionDigits: 0 });
  return formatters[currency].format(amount);
}

/** True for items that are bought alone on their own page (they carry a `usd` field). */
export const isDirectOffer = (item) => item.usd != null;

/** The amount and currency this site charges for an item. */
export function priceOf(item) {
  const amount = CURRENCY === HOME_CURRENCY ? undefined : item.prices?.[CURRENCY.toLowerCase()];
  // An item without a price in the chosen currency (none today) is shown, and charged, in shekels.
  return amount == null ? { amount: item.price, currency: HOME_CURRENCY } : { amount, currency: CURRENCY };
}

/** The number this site charges for an item, for sums, sorting and filters. */
export const amountOf = (item) => priceOf(item).amount;

/** Format a sum of prices (a cart total, a filter value) in the visitor's currency. Shekels keep their old whole-number look. */
export const money = (amount) => (CURRENCY === HOME_CURRENCY ? formatPrice(amount) : formatMoney(amount, CURRENCY));

export const priceLabel = (item) => {
  const { amount, currency } = priceOf(item);
  return formatMoney(amount, currency);
};

/** Hash of the single-item checkout page for a product or plan. */
export const buyHref = (id) => `#buy-${id}`;
