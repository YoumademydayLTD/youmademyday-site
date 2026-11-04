// Prices that only CRX Platform links use, in currencies the site does not sell in (minor units, tax included).
// Owner, 04.11.2026: the Maximum membership (297 ₪ a week on the site) is offered through CRX at 100 GEL a week,
// with the same free first day. Polar charges these as an ad-hoc price on the plan's own product, so the
// subscription is still the Maximum plan (same library, same personal area) and no extra Polar product exists.
import type { PolarCurrency } from "../polar/checkout-body.ts";

export const LINK_PRICES: Readonly<Record<string, Partial<Record<PolarCurrency, number>>>> = {
  "plan-max": { gel: 10_000 },
};

/** The link-only price of a store id in a currency, if one is set. */
export const linkPriceOf = (storeId: string, currency: string): number | undefined =>
  LINK_PRICES[storeId]?.[currency as PolarCurrency];
