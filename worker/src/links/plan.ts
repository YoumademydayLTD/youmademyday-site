// The Polar checkout for a CRX link (pure): no success_url, so the buyer ends on Polar's own confirmation page.
import { HttpError } from "../http/errors.ts";
import type { Catalog } from "../catalog/index.ts";
import { linkPriceOf } from "../catalog/link-prices.ts";
import { PLAN_ID_PREFIX, type ProductMap } from "../polar/mapping.ts";
import { adHocPrice, type PolarCheckoutBody } from "../polar/checkout-body.ts";
import type { LinkRequest } from "./request.ts";

// The buyer's ym number, when the store knows him (telegram_user_id): Polar then locks the email to his internal one.
export interface LinkContext { map: ProductMap; catalog: Catalog; buyerYm?: string }
export interface LinkPlan { body: PolarCheckoutBody; amount: number; productId: string; itemIds: string[] }

const TRIAL_UNIT = "day";

interface LinkPrice { amount: number; isAdHoc: boolean }

/** What the link charges: the caller's amount, else Polar's catalogue price, else our link-only price (all ad-hoc but the catalogue one). */
function priceFor(request: LinkRequest, map: ProductMap): LinkPrice {
  if (request.amount !== undefined) return { amount: request.amount, isAdHoc: true };
  const catalogPrice = map[request.storeId]?.prices[request.currency];
  if (catalogPrice) return { amount: catalogPrice.amount, isAdHoc: false };
  const linkPrice = linkPriceOf(request.storeId, request.currency);
  if (linkPrice !== undefined) return { amount: linkPrice, isAdHoc: true };
  throw new HttpError("bad_request", `${request.storeId} has no ${request.currency} price; send an amount`);
}

/** A plan's id without the store prefix ("plan-max" → "max"), as the site records plan sales. */
const planIdOf = (storeId: string): string | null => (storeId.startsWith(PLAN_ID_PREFIX) ? storeId.slice(PLAN_ID_PREFIX.length) : null);

/** The free days a plan starts with, set on the checkout itself so it never depends on the product's setting. */
function trialFields(storeId: string, catalog: Catalog): Pick<PolarCheckoutBody, "trial_interval" | "trial_interval_count"> {
  const planId = planIdOf(storeId);
  const trialDays = planId ? catalog.plans[planId]?.trialDays ?? 0 : 0;
  return trialDays > 0 ? { trial_interval: TRIAL_UNIT, trial_interval_count: trialDays } : {};
}

export function planLink(request: LinkRequest, context: LinkContext): LinkPlan {
  const mapped = context.map[request.storeId];
  if (!mapped) throw new HttpError("unknown_item", `unknown product ${request.storeId}`);
  const price = priceFor(request, context.map);
  const planId = planIdOf(request.storeId);
  // Plans are recorded by their plan id, like the site does, so invoices and the order document name the plan.
  const itemIds = [planId && context.catalog.plans[planId] ? planId : request.storeId];
  const externalCustomerId = context.buyerYm ?? request.externalCustomerId;
  const body: PolarCheckoutBody = {
    products: [mapped.productId],
    currency: request.currency,
    ...(price.isAdHoc ? { prices: { [mapped.productId]: [adHocPrice(price.amount, request.currency)] } } : {}),
    ...(mapped.recurring ? trialFields(request.storeId, context.catalog) : {}),
    allow_discount_codes: false,
    metadata: {
      ...request.metadata, ymd_source: "crx", ymd_kind: "link", ymd_ids: itemIds.join(","),
      ...(context.buyerYm ? { ymd_customer: context.buyerYm } : {}),
    },
    ...(request.customerEmail ? { customer_email: request.customerEmail } : {}),
    ...(externalCustomerId ? { external_customer_id: externalCustomerId } : {}),
    ...(request.lang ? { locale: request.lang } : {}),
    ...(request.country ? { customer_billing_address: { country: request.country } } : {}),
    ...(request.customerIp ? { customer_ip_address: request.customerIp } : {}),
  };
  return { body, amount: price.amount, productId: mapped.productId, itemIds };
}
