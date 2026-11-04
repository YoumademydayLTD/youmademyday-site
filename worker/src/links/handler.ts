// POST /api/links: server-to-server (CRX Platform). Authenticated with the shared secret in YMD_LINKS_SECRET.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject } from "../http/response.ts";
import { timingSafeEqualText } from "../http/compare.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { createCheckout, PolarApiError } from "../polar/client.ts";
import { insertCheckout } from "../db/checkouts.ts";
import { parseLinkRequest } from "./request.ts";
import { planLink } from "./plan.ts";

const BEARER = "Bearer ";

export function assertAuthorized(header: string | null, secret: string): void {
  // An unset secret must never let everyone in.
  if (!secret || !header?.startsWith(BEARER) || !timingSafeEqualText(header.slice(BEARER.length), secret)) {
    throw new HttpError("unauthorized", "missing or wrong Authorization: Bearer <secret>");
  }
}

export async function handleLink(request: Request, env: Env, now: Date): Promise<{ url: string; id: string; expires_at: string }> {
  assertAuthorized(request.headers.get("Authorization"), env.YMD_LINKS_SECRET);
  const parsed = parseLinkRequest(await readJsonObject(request), PRODUCT_MAP);
  const { body, amount, productId } = planLink(parsed, PRODUCT_MAP);
  let checkout;
  try {
    checkout = await createCheckout({ apiBase: env.POLAR_API, token: env.POLAR_ACCESS_TOKEN }, body);
  } catch (error) {
    if (!(error instanceof PolarApiError)) throw error;
    console.error("links: Polar refused", error.status, error.detail);
    // A server caller gets Polar's reason (e.g. an amount under the currency minimum) to fix its request.
    throw new HttpError("payment_provider_error", `Polar refused the link: ${error.detail}`);
  }
  await insertCheckout(env.DB, {
    id: checkout.id, source: "crx", kind: "link", itemIds: [parsed.storeId], lang: parsed.lang ?? null,
    currency: parsed.currency, amount, polarProductId: productId, status: checkout.status, metadata: body.metadata,
  }, now.toISOString());
  return { url: checkout.url, id: checkout.id, expires_at: checkout.expires_at };
}
