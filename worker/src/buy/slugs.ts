// The reusable payment links (pure): a short slug per offer, the same URL for everyone, a fresh checkout on every open.
// Owner, 05.11.2026: one link he can open as often as he likes and share on Instagram, with no buyer pre-filled.
import type { PolarCurrency } from "../polar/checkout-body.ts";

export interface ReusableLink { storeId: string; currency: PolarCurrency; lang: string }

// Owner, 05.11.2026: «עריכה» (plan-edit) at the CRX price, 100 GEL a week after one free day (src/catalog/link-prices.ts).
export const REUSABLE_LINKS: Readonly<Record<string, ReusableLink>> = {
  edit: { storeId: "plan-edit", currency: "gel", lang: "he" },
};

export const BUY_PATH_PREFIX = "/buy/";
// «Stay in this browser»: the in-app fallback opens the checkout where it is instead of bouncing again.
export const STAY_PARAM = "here";
export const STAY_VALUE = "1";

/** The offer behind a slug; null for any slug not in the table (never an inherited key like "constructor"). */
export const reusableLinkOf = (slug: string): ReusableLink | null =>
  (Object.hasOwn(REUSABLE_LINKS, slug) ? REUSABLE_LINKS[slug] ?? null : null);

/** The public URL of a reusable link, built from the configured base and a table slug only (never from the request). */
export function buyUrlOf(baseUrl: string, slug: string, isStay = false): string {
  const url = `${baseUrl.replace(/\/+$/, "")}${BUY_PATH_PREFIX}${encodeURIComponent(slug)}`;
  return isStay ? `${url}?${STAY_PARAM}=${STAY_VALUE}` : url;
}

/** Whether the request asks to open the checkout in the browser it came from. */
export const isStayRequest = (requestUrl: string): boolean => new URL(requestUrl).searchParams.get(STAY_PARAM) === STAY_VALUE;
