// Turn a validated site request into the Polar checkout to open and the row we keep (pure).
import { HttpError } from "../http/errors.ts";
import { cartTotal, currencyFor, toMinor, type Catalog, type Currency } from "../catalog/index.ts";
import { PLAN_ID_PREFIX, STORE_ORDER_ID, type ProductMap } from "../polar/mapping.ts";
import { adHocPrice, type PolarCheckoutBody } from "../polar/checkout-body.ts";
import type { CheckoutRequest } from "./request.ts";
import { langPrefix, returnUrl, successUrl } from "./site-urls.ts";

export interface CheckoutContext { catalog: Catalog; map: ProductMap; siteUrl: string }
export interface CheckoutRecord { kind: string; itemIds: string[]; lang: string; currency: Currency; amount: number; polarProductId: string }
export interface CheckoutPlan { body: PolarCheckoutBody; record: CheckoutRecord }

// The server owns prices, so the buyer cannot type in a discount code that Polar would apply on its own.
const ALLOW_DISCOUNT_CODES = false;

function mappedPrice(map: ProductMap, storeId: string, currency: Currency, amount: number): string {
  const mapped = map[storeId];
  const price = mapped?.prices[currency];
  // A site price edited without re-running tools/polar_sync.ts must fail loudly, never charge the old price.
  if (!mapped || !price || price.amount !== amount) {
    throw new HttpError("catalog_out_of_sync", `${storeId} ${currency} ${amount} is not on Polar yet; run tools/polar_sync.ts`);
  }
  return mapped.productId;
}

interface Sale { storeId: string; currency: Currency; amount: number; adHoc: boolean; backHash: string; itemIds: string[] }

function saleFor(request: CheckoutRequest, catalog: Catalog): Sale {
  if (request.kind === "plan") {
    const plan = catalog.plans[request.id];
    if (!plan) throw new HttpError("unknown_item", `unknown plan ${request.id}`);
    const { currency, amount } = currencyFor(request.lang, plan, catalog.homeCurrencyLang);
    return { storeId: `${PLAN_ID_PREFIX}${request.id}`, currency, amount: toMinor(amount), adHoc: false, backHash: `buy-${PLAN_ID_PREFIX}${request.id}`, itemIds: [request.id] };
  }
  const ids = request.kind === "cart" ? request.ids : [request.id];
  const items = ids.map((id) => {
    const product = catalog.products[id];
    if (!product) throw new HttpError("unknown_item", `unknown product ${id}`);
    return product;
  });
  const [first] = items;
  if (items.length === 1 && first) {
    const { currency, amount } = currencyFor(request.lang, first, catalog.homeCurrencyLang);
    const backHash = request.kind === "cart" ? "checkout" : `buy-${ids[0]}`;
    return { storeId: ids[0] ?? "", currency, amount: toMinor(amount), adHoc: false, backHash, itemIds: ids };
  }
  // Polar sells one product per checkout: several items become one store order at the server-computed total.
  return { storeId: STORE_ORDER_ID, currency: "ils", amount: toMinor(cartTotal(items, catalog.bookDealMin).total), adHoc: true, backHash: "checkout", itemIds: ids };
}

export function planCheckout(request: CheckoutRequest, context: CheckoutContext): CheckoutPlan {
  const sale = saleFor(request, context.catalog);
  const productId = sale.adHoc ? context.map[sale.storeId]?.productId : mappedPrice(context.map, sale.storeId, sale.currency, sale.amount);
  if (!productId) throw new HttpError("catalog_out_of_sync", `${sale.storeId} is not on Polar yet; run tools/polar_sync.ts`);
  const prefix = langPrefix(request.lang, context.catalog.defaultLang);
  const body: PolarCheckoutBody = {
    products: [productId],
    currency: sale.currency,
    ...(sale.adHoc ? { prices: { [productId]: [adHocPrice(sale.amount, sale.currency)] } } : {}),
    success_url: successUrl(context.siteUrl, prefix),
    return_url: returnUrl(context.siteUrl, prefix, sale.backHash),
    locale: request.lang, // Polar falls back to English for languages it does not have
    allow_discount_codes: ALLOW_DISCOUNT_CODES,
    metadata: { ymd_source: "site", ymd_kind: request.kind, ymd_ids: sale.itemIds.join(","), ymd_lang: request.lang },
  };
  return { body, record: { kind: request.kind, itemIds: sale.itemIds, lang: request.lang, currency: sale.currency, amount: sale.amount, polarProductId: productId } };
}
