// One fresh Polar checkout for a reusable link: the CRX link's price and trial, and no buyer at all (owner, 05.11.2026:
// no name, email or customer pre-filled), so whoever opens the link types their own details on Polar's page.
import type { Env } from "../env.ts";
import { CATALOG } from "../catalog/index.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { createCheckout, polarConfig } from "../polar/client.ts";
import { insertCheckout } from "../db/checkouts.ts";
import { chooseCountry } from "../customers/country.ts";
import { planLink } from "../links/plan.ts";
import type { LinkRequest } from "../links/request.ts";
import type { ReusableLink } from "./slugs.ts";

export const REUSABLE_KIND = "reusable";
const LINK_SOURCE = "crx";

// The buyer's own browser opens this link, so Cloudflare's view of the visitor is the buyer (unlike /api/links).
export interface Visitor { country: unknown; ip: string | null }
export interface ReusableCheckoutInput { env: Env; link: ReusableLink; visitor: Visitor; now: Date }

/** The link request for one open: the offer's product, currency and language, the visitor's country, nothing else. */
export function reusableRequest(link: ReusableLink, visitor: Visitor): LinkRequest {
  const country = chooseCountry({ located: visitor.country, lang: link.lang });
  return {
    storeId: link.storeId, currency: link.currency, metadata: {}, lang: link.lang,
    ...(country ? { country } : {}),
    ...(visitor.ip ? { customerIp: visitor.ip } : {}),
  };
}

/** Opens the checkout on Polar and records it like a CRX link; returns Polar's payment page URL. Polar errors propagate. */
export async function openReusableCheckout({ env, link, visitor, now }: ReusableCheckoutInput): Promise<string> {
  const request = reusableRequest(link, visitor);
  const { body, amount, productId, itemIds } = planLink(request, { map: PRODUCT_MAP, catalog: CATALOG, kind: REUSABLE_KIND });
  const checkout = await createCheckout(polarConfig(env), body);
  try {
    await insertCheckout(env.DB, {
      id: checkout.id, source: LINK_SOURCE, kind: REUSABLE_KIND, itemIds, lang: link.lang, currency: link.currency, amount,
      polarProductId: productId, status: checkout.status, metadata: body.metadata, customerYm: null,
    }, now.toISOString());
  } catch (error) {
    // The buyer still gets the page: Polar's checkout.* webhooks record the row too (with the same metadata).
    console.error("buy: checkout not recorded", checkout.id, error instanceof Error ? error.message : String(error));
  }
  return checkout.url;
}
