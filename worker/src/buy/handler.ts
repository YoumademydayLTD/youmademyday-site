// GET /buy/:slug — a reusable payment link (owner, 05.11.2026): the same URL for every buyer, a fresh Polar checkout on
// every open. A normal browser gets a 302 to the new page; an app's in-app browser (Instagram, Telegram) first gets the
// «open in the real browser» bounce, pointing back at this same link so Safari or Chrome opens the checkout itself.
import type { Env } from "../env.ts";
import { PolarApiError } from "../polar/client.ts";
import { visitorOf } from "../customers/country.ts";
import { isPolarCheckoutUrl } from "../go/link.ts";
import { GO_COPY } from "../go/copy.ts";
import { pageHeaders, renderBouncePage, renderMissingPage, renderNoticePage } from "../go/page.ts";
import { decideBuy } from "./decide.ts";
import { openReusableCheckout } from "./checkout.ts";
import { buyUrlOf, isStayRequest, type ReusableLink } from "./slugs.ts";

const HTTP_FOUND = 302;
const HTTP_NOT_FOUND = 404;
const HTTP_BAD_GATEWAY = 502;

export interface BuyRequestContext { env: Env; nonce: string; now: Date }

const page = (html: string, nonce: string, status = 200): Response => new Response(html, { status, headers: pageHeaders(nonce) });

function failedPage(retryUrl: string, nonce: string): Response {
  const copy = GO_COPY.failed;
  return page(renderNoticePage({ nonce, heading: copy.heading, body: copy.body, button: { label: copy.button, href: retryUrl } }), nonce, HTTP_BAD_GATEWAY);
}

/** Opens a new checkout and sends the browser to it; only a Polar payment page the store just created is ever a target. */
async function redirectToCheckout(request: Request, link: ReusableLink, retryUrl: string, context: BuyRequestContext): Promise<Response> {
  const { env, nonce, now } = context;
  let url: string;
  try {
    url = await openReusableCheckout({ env, link, visitor: visitorOf(request), now });
  } catch (error) {
    if (!(error instanceof PolarApiError)) throw error;
    console.error("buy: Polar refused", link.storeId, error.status, error.detail);
    return failedPage(retryUrl, nonce);
  }
  if (!isPolarCheckoutUrl(url)) {
    console.error("buy: Polar returned a payment page outside polar.sh", link.storeId);
    return failedPage(retryUrl, nonce);
  }
  return new Response(null, { status: HTTP_FOUND, headers: { Location: url, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Vary": "User-Agent" } });
}

export async function handleBuy(request: Request, slug: string, context: BuyRequestContext): Promise<Response> {
  const { env, nonce } = context;
  const decision = decideBuy({ slug, userAgent: request.headers.get("User-Agent"), isStay: isStayRequest(request.url) });
  if (decision.action === "missing") return page(renderMissingPage(nonce), nonce, HTTP_NOT_FOUND);
  const linkUrl = buyUrlOf(env.GO_BASE_URL, slug);
  const stayUrl = buyUrlOf(env.GO_BASE_URL, slug, true);
  if (decision.action === "preview") {
    const copy = GO_COPY.preview;
    return page(renderNoticePage({ nonce, heading: copy.heading, body: copy.body, button: { label: copy.button, href: linkUrl } }), nonce);
  }
  if (decision.action === "bounce") return page(renderBouncePage({ kind: decision.kind, checkoutUrl: linkUrl, stayUrl, nonce }), nonce);
  return redirectToCheckout(request, decision.link, stayUrl, context);
}
