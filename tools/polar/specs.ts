// What the Polar catalogue should look like, derived from the site catalogue (pure, no network).
// Every product we own carries metadata.ymd_id; products without it belong to the owner and are never touched.
import type { Catalog } from "../build_catalog.ts";

export type Currency = "ils" | "usd";
export type Interval = "week" | "month";

export interface PriceSpec { currency: Currency; amount: number }
export interface ProductSpec {
  ymdId: string;
  name: string;
  description: string;
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

const toMinor = (major: number): number => Math.round(major * MINOR_UNITS);

function pricesOf(item: { price: number; usd?: number }): PriceSpec[] {
  const prices: PriceSpec[] = [{ currency: "ils", amount: toMinor(item.price) }];
  if (item.usd != null) prices.push({ currency: "usd", amount: toMinor(item.usd) });
  return prices;
}

export function productSpecs(catalog: Catalog): ProductSpec[] {
  const products = Object.entries(catalog.products).map(([id, p]): ProductSpec => ({
    ymdId: id, name: p.title, description: p.description, visibility: "public", recurring: null, trialDays: 0, prices: pricesOf(p),
  }));
  const plans = Object.entries(catalog.plans).map(([id, p]): ProductSpec => ({
    ymdId: `${PLAN_ID_PREFIX}${id}`, name: p.title, description: p.description, visibility: "public", recurring: p.period, trialDays: p.trialDays, prices: pricesOf(p),
  }));
  const storeOrder: ProductSpec = {
    ymdId: STORE_ORDER_ID,
    name: "הזמנה מהחנות / Store order",
    description: "הזמנה של כמה מוצרים מהחנות · An order of several items from the store",
    visibility: "private",
    recurring: null,
    trialDays: 0,
    prices: [{ currency: "ils", amount: toMinor(STORE_ORDER_PLACEHOLDER_ILS) }],
  };
  return [...products, ...plans, storeOrder];
}
