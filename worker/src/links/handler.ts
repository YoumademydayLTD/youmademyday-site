// POST /api/links and GET /api/links/:id/status: server-to-server (CRX Platform), authenticated with the shared
// secret in YMD_LINKS_SECRET. CRX never talks to Polar itself (owner, 04.11.2026): the store's own Polar token
// opens every checkout.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject } from "../http/response.ts";
import { timingSafeEqualText } from "../http/compare.ts";
import { CATALOG } from "../catalog/index.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { createCheckout, PolarApiError, polarConfig } from "../polar/client.ts";
import { insertCheckout, saveGoLink } from "../db/checkouts.ts";
import { GO_ID_LENGTH, goUrlOf, isPolarCheckoutUrl, newGoId } from "../go/link.ts";
import { ensureBuyer } from "../customers/buyer.ts";
import type { Customer } from "../customers/repo.ts";
import { parseLinkRequest, type LinkRequest } from "./request.ts";
import { planLink } from "./plan.ts";
import { readLinkStatus, type LinkStatus } from "./status.ts";

const BEARER = "Bearer ";

export function assertAuthorized(header: string | null, secret: string): void {
  // An unset secret must never let everyone in.
  if (!secret || !header?.startsWith(BEARER) || !timingSafeEqualText(header.slice(BEARER.length), secret)) {
    throw new HttpError("unauthorized", "missing or wrong Authorization: Bearer <secret>");
  }
}

/** The store's own customer for the buyer's Telegram id, created silently (no message, no email) when new. */
async function buyerOf(env: Env, request: LinkRequest, now: Date): Promise<Customer | null> {
  return request.telegramUserId === undefined ? null : ensureBuyer(env, request.telegramUserId, now);
}

// `url` is Polar's page as before; `go_url` is the bounce that opens it in the phone's real browser (null only if
// Polar ever answered with a page outside polar.sh, which the bounce refuses to serve).
export interface LinkReply { url: string; go_url: string | null; id: string; expires_at: string }

/** Stores the bounce for a new link and returns its public URL. */
async function createGoLink(env: Env, checkoutId: string, url: string, randomBytes: Uint8Array): Promise<string | null> {
  if (!isPolarCheckoutUrl(url)) {
    console.error("links: Polar returned a payment page outside polar.sh, no go link", checkoutId);
    return null;
  }
  const goId = newGoId(randomBytes);
  await saveGoLink(env.DB, { checkoutId, url, goId });
  return goUrlOf(env.GO_BASE_URL, goId);
}

export async function handleLink(request: Request, env: Env, now: Date, randomBytes: Uint8Array = crypto.getRandomValues(new Uint8Array(GO_ID_LENGTH))): Promise<LinkReply> {
  assertAuthorized(request.headers.get("Authorization"), env.YMD_LINKS_SECRET);
  const parsed = parseLinkRequest(await readJsonObject(request), PRODUCT_MAP);
  // Price check first (pure): a request that cannot be sold must not create a customer here or on Polar.
  planLink(parsed, { map: PRODUCT_MAP, catalog: CATALOG });
  const buyer = await buyerOf(env, parsed, now);
  // The caller's country wins (it may know where the buyer is now); else the one saved on his account.
  const withCountry: LinkRequest = !parsed.country && buyer?.country ? { ...parsed, country: buyer.country } : parsed;
  const { body, amount, productId, itemIds } = planLink(withCountry, { map: PRODUCT_MAP, catalog: CATALOG, ...(buyer ? { buyerYm: buyer.ym } : {}) });
  let checkout;
  try {
    checkout = await createCheckout(polarConfig(env), body);
  } catch (error) {
    if (!(error instanceof PolarApiError)) throw error;
    console.error("links: Polar refused", error.status, error.detail);
    // A server caller gets Polar's reason (e.g. an amount under the currency minimum) to fix its request.
    throw new HttpError("payment_provider_error", `Polar refused the link: ${error.detail}`);
  }
  await insertCheckout(env.DB, {
    id: checkout.id, source: "crx", kind: "link", itemIds, lang: parsed.lang ?? null,
    currency: parsed.currency, amount, polarProductId: productId, status: checkout.status, metadata: body.metadata,
    customerYm: buyer?.ym ?? null,
  }, now.toISOString());
  const goUrl = await createGoLink(env, checkout.id, checkout.url, randomBytes);
  return { url: checkout.url, go_url: goUrl, id: checkout.id, expires_at: checkout.expires_at };
}

export async function handleLinkStatus(request: Request, env: Env, checkoutId: string): Promise<LinkStatus> {
  assertAuthorized(request.headers.get("Authorization"), env.YMD_LINKS_SECRET);
  const status = await readLinkStatus(env.DB, checkoutId, PRODUCT_MAP);
  // Only links CRX opened: the same secret must never read the site's own checkouts.
  if (!status) throw new HttpError("not_found", `no CRX link ${checkoutId}`);
  return status;
}
