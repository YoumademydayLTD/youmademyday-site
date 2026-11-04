// POST /api/checkout: the site asks for a payment page for a cart, a product or a plan, and gets its URL.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject } from "../http/response.ts";
import { CATALOG } from "../catalog/index.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { createCheckout, PolarApiError } from "../polar/client.ts";
import { insertCheckout } from "../db/checkouts.ts";
import { liveKinds, parseCheckoutRequest } from "./request.ts";
import { planCheckout } from "./plan.ts";

export async function handleCheckout(request: Request, env: Env, now: Date): Promise<{ url: string }> {
  const parsed = parseCheckoutRequest(await readJsonObject(request), CATALOG);
  if (!liveKinds(env.LIVE_KINDS).has(parsed.kind)) throw new HttpError("kind_closed", `${parsed.kind} checkout is not open yet`);
  const { body, record } = planCheckout(parsed, { catalog: CATALOG, map: PRODUCT_MAP, siteUrl: env.SITE_URL });
  let checkout;
  try {
    checkout = await createCheckout({ apiBase: env.POLAR_API, token: env.POLAR_ACCESS_TOKEN }, body);
  } catch (error) {
    if (!(error instanceof PolarApiError)) throw error;
    console.error("checkout: Polar refused", error.status, error.detail);
    throw new HttpError("payment_provider_error", "the payment page could not be opened");
  }
  await insertCheckout(env.DB, { id: checkout.id, source: "site", status: checkout.status, metadata: body.metadata, ...record }, now.toISOString());
  return { url: checkout.url };
}
