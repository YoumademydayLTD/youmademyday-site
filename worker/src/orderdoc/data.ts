// What the order details document shows, from an order and the catalogue (pure).
import type { Business, Catalog, CatalogPlan, Currency, Priced } from "../catalog/index.ts";
import { cartTotal, priceIn, toMinor } from "../catalog/index.ts";
import { titleFor } from "../delivery/items.ts";
import { linkPriceOf } from "../catalog/link-prices.ts";
import { PLAN_ID_PREFIX } from "../polar/mapping.ts";

export interface DocOrder { id: string; status: string; currency: string; totalAmount: number; itemIds: string[]; createdAt: string }
export interface DocItem { title: string; amount: number } // minor units, in the order currency
export interface DocPlan { title: string; period: CatalogPlan["period"]; amount: number; trialDays: number }
export interface DocData {
  lang: string; orderId: string; date: string; currency: string; status: string;
  items: DocItem[]; deal: number; total: number; plan: DocPlan | null; hasFiles: boolean;
  business: Business; refundDays: number; refundsUrl: string;
}

/** An item's catalogue price in the order's currency, in minor units (its shekel price when it has none in that currency). */
const linePrice = (currency: Currency, item: Priced): number => toMinor(priceIn(item, currency) ?? item.price);

/** A line's price in a currency the catalogue has no price in (CRX links in GEL): our link-only price, else the order total. */
const linkLinePrice = (storeId: string, order: DocOrder): number => linkPriceOf(storeId, order.currency) ?? order.totalAmount;

/** The document's language: the buyer's, when the site has it; else the default. */
export const docLang = (lang: string | null, catalog: Catalog): string => (lang && catalog.business[lang] ? lang : catalog.defaultLang);

export function buildDocData(order: DocOrder, lang: string, catalog: Catalog, refundsUrl: string): DocData {
  const business = catalog.business[lang] ?? catalog.business[catalog.defaultLang];
  if (!business) throw new Error(`no company details for ${lang}`);
  const products = order.itemIds.flatMap((id) => {
    const product = catalog.products[id];
    return product ? [{ id, product }] : [];
  });
  const planId = order.itemIds.find((id) => catalog.plans[id]);
  const plan = planId ? catalog.plans[planId] : undefined;
  // A currency the catalogue sells in; anything else (GEL) comes only from CRX links.
  const currency = catalog.currencies.find((code) => code === order.currency);
  const items: DocItem[] = products.map(({ id, product }) => ({
    title: titleFor(id, lang, catalog), amount: currency ? linePrice(currency, product) : linkLinePrice(id, order),
  }));
  // The "3 books, cheapest free" deal is counted in the order's own currency, when every item has a price in it.
  const isWholeCartPriced = currency !== undefined && products.every((p) => priceIn(p.product, currency) !== undefined);
  const deal = isWholeCartPriced ? toMinor(cartTotal(products.map((p) => p.product), catalog.bookDealMin, currency).bookDeal) : 0;
  const docPlan: DocPlan | null = plan && planId
    ? { title: plan.titles[lang] ?? plan.title, period: plan.period, amount: currency ? linePrice(currency, plan) : linkLinePrice(`${PLAN_ID_PREFIX}${planId}`, order), trialDays: plan.trialDays }
    : null;
  return {
    lang, orderId: order.id, date: order.createdAt, currency: order.currency, status: order.status,
    items: docPlan ? [{ title: docPlan.title, amount: docPlan.amount }, ...items] : items,
    deal, total: order.totalAmount, plan: docPlan, hasFiles: products.length > 0,
    business, refundDays: catalog.refundDays, refundsUrl,
  };
}
