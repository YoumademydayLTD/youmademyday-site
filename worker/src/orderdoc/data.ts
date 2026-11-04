// What the order details document shows, from an order and the catalogue (pure).
import type { Business, Catalog, CatalogPlan } from "../catalog/index.ts";
import { cartTotal, toMinor } from "../catalog/index.ts";
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

const USD = "usd";
const ILS = "ils";
const priceIn = (currency: string, item: { price: number; usd?: number }): number => toMinor(currency === USD && item.usd != null ? item.usd : item.price);

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
  const isCatalogCurrency = order.currency === ILS || order.currency === USD;
  const items: DocItem[] = products.map(({ id, product }) => ({
    title: titleFor(id, lang, catalog), amount: isCatalogCurrency ? priceIn(order.currency, product) : linkLinePrice(id, order),
  }));
  // The "3 books, cheapest free" deal applies to shekel carts only (direct offers are never in a cart).
  const deal = order.currency !== ILS ? 0 : toMinor(cartTotal(products.map((p) => p.product), catalog.bookDealMin).bookDeal);
  const docPlan: DocPlan | null = plan && planId
    ? { title: plan.titles[lang] ?? plan.title, period: plan.period, amount: isCatalogCurrency ? priceIn(order.currency, plan) : linkLinePrice(`${PLAN_ID_PREFIX}${planId}`, order), trialDays: plan.trialDays }
    : null;
  return {
    lang, orderId: order.id, date: order.createdAt, currency: order.currency, status: order.status,
    items: docPlan ? [{ title: docPlan.title, amount: docPlan.amount }, ...items] : items,
    deal, total: order.totalAmount, plan: docPlan, hasFiles: products.length > 0,
    business, refundDays: catalog.refundDays, refundsUrl,
  };
}
