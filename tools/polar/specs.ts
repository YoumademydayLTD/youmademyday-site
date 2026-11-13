// What the Polar catalogue should look like, derived from the site catalogue (pure, no network).
// Every product we own carries metadata.ymd_id; products without it belong to the owner and are never touched.
import type { Catalog } from "../build_catalog.ts";

export type Currency = "ils" | "usd" | "cad" | "eur" | "gbp" | "aud";
type PricedItem = { price: number; usd?: number; prices?: Partial<Record<Currency, number>> };
export type Interval = "week" | "month";

export interface PriceSpec { currency: Currency; amount: number }
export interface ProductSpec {
  ymdId: string;
  name: string;
  description: string | null; // null: owner wants only the product name on the payment page (04.11.2026)
  visibility: "public" | "private";
  recurring: Interval | null;
  trialDays: number;
  prices: PriceSpec[];
}

export const YMD_ID_KEY = "ymd_id";
export const PLAN_ID_PREFIX = "plan-"; // same prefix as the site's #buy-plan-<id> pages
export const STORE_ORDER_ID = "store-order";
const MINOR_UNITS = 100;
// The store order is always sold with an ad-hoc price (the server-computed cart total); this catalog price
// only exists because Polar requires one. The product is private, so nobody can buy it at this price.
const STORE_ORDER_PLACEHOLDER_ILS = 100;

// Owner, 13.11.2026: the payment page names only the kind of thing bought, never the item itself — «Subscription»
// for every plan, «Book» for the one-dollar short guides. The buyer sees the real title in his personal area, on
// the order document and in the bot, which all read the catalogue and not this name.
export const PLAN_CHECKOUT_NAME = "Subscription";
export const SHORT_GUIDE_CHECKOUT_NAME = "Book";
// the one-dollar short guides are the catalogue numbers 53–76 (the same range as the worker's «short-guide» link group)
const FIRST_SHORT_GUIDE = 53;
const LAST_SHORT_GUIDE = 76;
const isShortGuide = (product: { n?: number }): boolean => product.n != null && product.n >= FIRST_SHORT_GUIDE && product.n <= LAST_SHORT_GUIDE;

const toMinor = (major: number): number => Math.round(major * MINOR_UNITS);

/** One Polar price per currency: shekels (the organization's default), then the item's other currencies (owner, 12.11.2026). */
function pricesOf(item: PricedItem): PriceSpec[] {
  const others: Partial<Record<Currency, number>> = { ...(item.usd != null ? { usd: item.usd } : {}), ...item.prices };
  return [
    { currency: "ils", amount: toMinor(item.price) },
    ...Object.entries(others).map(([currency, amount]): PriceSpec => ({ currency: currency as Currency, amount: toMinor(amount) })),
  ];
}

export function productSpecs(catalog: Catalog): ProductSpec[] {
  const products = Object.entries(catalog.products).map(([id, p]): ProductSpec => ({
    ymdId: id, name: isShortGuide(p) ? SHORT_GUIDE_CHECKOUT_NAME : p.title, description: null, visibility: "public", recurring: null, trialDays: 0, prices: pricesOf(p),
  }));
  // A plan sold as a course (owner 05.11.2026, the editing studio) also shows its description on the payment page.
  const plans = Object.entries(catalog.plans).map(([id, p]): ProductSpec => ({
    ymdId: `${PLAN_ID_PREFIX}${id}`, name: PLAN_CHECKOUT_NAME, description: p.describeOnCheckout ? p.description : null, visibility: "public", recurring: p.period, trialDays: p.trialDays, prices: pricesOf(p),
  }));
  const storeOrder: ProductSpec = {
    ymdId: STORE_ORDER_ID,
    name: "הזמנה מהחנות / Store order",
    description: null,
    visibility: "private",
    recurring: null,
    trialDays: 0,
    prices: [{ currency: "ils", amount: toMinor(STORE_ORDER_PLACEHOLDER_ILS) }],
  };
  return [...products, ...plans, storeOrder];
}
