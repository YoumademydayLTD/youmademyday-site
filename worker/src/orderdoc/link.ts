// Signed links to an order details document. They last a year: the document is the disclosure the law requires,
// and its link sits in the buyer's Telegram chat, so it must keep working long after the purchase.
import { createFileToken, type FileClaim } from "../delivery/token.ts";

export const DOC_KEY_PREFIX = "doc:";
const DOC_LINK_TTL_SECONDS = 365 * 24 * 60 * 60;

export async function orderDocUrl(origin: string, secret: string, orderId: string, lang: string, nowSeconds: number): Promise<string> {
  const token = await createFileToken({ key: `${DOC_KEY_PREFIX}${orderId}:${lang}`, filename: "", exp: nowSeconds + DOC_LINK_TTL_SECONDS }, secret);
  return `${origin}/api/order-doc?t=${token}`;
}

/** The order id and language a document claim names, or null for any other kind of link. */
export function parseDocClaim(claim: FileClaim | null): { orderId: string; lang: string } | null {
  if (!claim?.key.startsWith(DOC_KEY_PREFIX)) return null;
  const [orderId, lang] = claim.key.slice(DOC_KEY_PREFIX.length).split(":");
  return orderId && lang ? { orderId, lang } : null;
}
