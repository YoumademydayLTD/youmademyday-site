// GET /go/:id — the «open in the real browser» bounce for CRX payment links (owner, 05.11.2026).
// A normal browser gets a 302 to the Polar payment page at once; Telegram's (and other apps') in-app browser gets a
// tiny page that hands the buyer to Chrome (Android) or Safari (iPhone). Only Polar pages the store created are served.
import { findGoTarget } from "../db/checkouts.ts";
import { browserKindOf } from "./browser.ts";
import { isGoId, isPolarCheckoutUrl } from "./link.ts";
import { pageHeaders, renderBouncePage, renderMissingPage } from "./page.ts";

const HTTP_FOUND = 302;
const HTTP_NOT_FOUND = 404;
const NONCE_BYTES = 16;

export interface GoRequestContext { db: D1Database; nonce: string }

const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
export const newNonce = (randomBytes: Uint8Array = crypto.getRandomValues(new Uint8Array(NONCE_BYTES))): string => toBase64(randomBytes);

const missing = (nonce: string): Response => new Response(renderMissingPage(nonce), { status: HTTP_NOT_FOUND, headers: pageHeaders(nonce) });

export async function handleGo(request: Request, goId: string, context: GoRequestContext): Promise<Response> {
  const { db, nonce } = context;
  if (!isGoId(goId)) return missing(nonce);
  const target = await findGoTarget(db, goId);
  // Checked again on the way out: even a bad row can never turn this route into an open redirect.
  if (!target || !isPolarCheckoutUrl(target)) return missing(nonce);
  const kind = browserKindOf(request.headers.get("User-Agent"));
  if (kind === "browser") {
    return new Response(null, { status: HTTP_FOUND, headers: { Location: target, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "Vary": "User-Agent" } });
  }
  return new Response(renderBouncePage({ kind, checkoutUrl: target, nonce }), { headers: pageHeaders(nonce) });
}
