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
import { insertCheckout } from "../db/checkouts.ts";
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

export async function handleLink(request: Request, env: Env, now: Date): Promise<{ url: string; id: string; expires_at: string }> {
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
  return { url: checkout.url, id: checkout.id, expires_at: checkout.expires_at };
}

export async function handleLinkStatus(request: Request, env: Env, checkoutId: string): Promise<LinkStatus> {
  assertAuthorized(request.headers.get("Authorization"), env.YMD_LINKS_SECRET);
  const status = await readLinkStatus(env.DB, checkoutId, PRODUCT_MAP);
  // Only links CRX opened: the same secret must never read the site's own checkouts.
  if (!status) throw new HttpError("not_found", `no CRX link ${checkoutId}`);
  return status;
}
