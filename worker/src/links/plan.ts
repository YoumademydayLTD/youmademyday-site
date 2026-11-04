// The Polar checkout for a CRX link (pure): no success_url, so the buyer ends on Polar's own confirmation page.
import { HttpError } from "../http/errors.ts";
import type { ProductMap } from "../polar/mapping.ts";
import { adHocPrice, type PolarCheckoutBody } from "../polar/checkout-body.ts";
import type { LinkRequest } from "./request.ts";

export function planLink(request: LinkRequest, map: ProductMap): { body: PolarCheckoutBody; amount: number; productId: string } {
  const mapped = map[request.storeId];
  if (!mapped) throw new HttpError("unknown_item", `unknown product ${request.storeId}`);
  const catalogPrice = mapped.prices[request.currency];
  if (request.amount === undefined && !catalogPrice) {
    throw new HttpError("bad_request", `${request.storeId} has no ${request.currency} price; send an amount`);
  }
  const amount = request.amount ?? catalogPrice?.amount ?? 0;
  const body: PolarCheckoutBody = {
    products: [mapped.productId],
    currency: request.currency,
    ...(request.amount === undefined ? {} : { prices: { [mapped.productId]: [adHocPrice(request.amount, request.currency)] } }),
    allow_discount_codes: false,
    metadata: { ...request.metadata, ymd_source: "crx", ymd_kind: "link", ymd_ids: request.storeId },
    ...(request.customerEmail ? { customer_email: request.customerEmail } : {}),
    ...(request.externalCustomerId ? { external_customer_id: request.externalCustomerId } : {}),
    ...(request.lang ? { locale: request.lang } : {}),
    ...(request.country ? { customer_billing_address: { country: request.country } } : {}),
    ...(request.customerIp ? { customer_ip_address: request.customerIp } : {}),
  };
  return { body, amount, productId: mapped.productId };
}
