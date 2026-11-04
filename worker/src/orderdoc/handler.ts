// GET /api/order-doc?t=<signed token>: the order details document as a printable HTML page.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { CATALOG } from "../catalog/index.ts";
import { verifyFileToken } from "../delivery/token.ts";
import { findSoldOrder } from "../db/orders.ts";
import { langPrefix } from "../checkout/site-urls.ts";
import { parseDocClaim } from "./link.ts";
import { buildDocData } from "./data.ts";
import { renderOrderDoc } from "./render.ts";

const MS_PER_SECOND = 1000;
const NONCE_BYTES = 16;

export async function handleOrderDoc(request: Request, env: Env, now: Date): Promise<Response> {
  const claim = await verifyFileToken(new URL(request.url).searchParams.get("t") ?? "", env.FILES_SIGNING_SECRET, Math.floor(now.getTime() / MS_PER_SECOND));
  const doc = parseDocClaim(claim);
  if (!doc) throw new HttpError("unauthorized", "this document link is not valid; open your personal area for a new one");
  const order = await findSoldOrder(env.DB, doc.orderId);
  if (!order) throw new HttpError("not_found", "no such order");
  const refundsUrl = `${env.SITE_URL}${langPrefix(doc.lang, CATALOG.defaultLang)}/refunds`;
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(NONCE_BYTES))));
  return new Response(renderOrderDoc(buildDocData(order, doc.lang, CATALOG, refundsUrl), nonce), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
