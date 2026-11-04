// POST /api/checkout: the site asks for a payment page for a cart, a product or a plan, and gets its URL.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject } from "../http/response.ts";
import { CATALOG } from "../catalog/index.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { createCheckout, PolarApiError, polarConfig } from "../polar/client.ts";
import { insertCheckout } from "../db/checkouts.ts";
import { requireUser } from "../account/session.ts";
import { ensureBuyer } from "../customers/buyer.ts";
import { chooseCountry, visitorOf } from "../customers/country.ts";
import { saveCountry } from "../customers/repo.ts";
import { liveKinds, parseCheckoutRequest } from "./request.ts";
import { planCheckout } from "./plan.ts";

export async function handleCheckout(request: Request, env: Env, now: Date): Promise<{ url: string }> {
  const parsed = parseCheckoutRequest(await readJsonObject(request), CATALOG);
  if (!liveKinds(env.LIVE_KINDS).has(parsed.kind)) throw new HttpError("kind_closed", `${parsed.kind} checkout is not open yet`);
  // Owner, 04.11.2026: buying needs a Telegram sign-in; the customer never types an email.
  const user = await requireUser(request, env);
  const customer = await ensureBuyer(env, user.telegramId, now);
  const visitor = visitorOf(request);
  const country = chooseCountry({ saved: customer.country, located: visitor.country, lang: parsed.lang });
  if (country && !customer.country) await saveCountry(env.DB, customer.id, country);
  const planned = planCheckout(parsed, { catalog: CATALOG, map: PRODUCT_MAP, siteUrl: env.SITE_URL, customerYm: customer.ym });
  // Prefilled for Polar's tax and currency logic; the buyer can still change the country on the payment page.
  const body = { ...planned.body, ...(country ? { customer_billing_address: { country } } : {}), ...(visitor.ip ? { customer_ip_address: visitor.ip } : {}) };
  const { record } = planned;
  let checkout;
  try {
    checkout = await createCheckout(polarConfig(env), body);
  } catch (error) {
    if (!(error instanceof PolarApiError)) throw error;
    console.error("checkout: Polar refused", error.status, error.detail);
    throw new HttpError("payment_provider_error", "the payment page could not be opened");
  }
  await insertCheckout(env.DB, { id: checkout.id, source: "site", status: checkout.status, metadata: body.metadata, customerYm: customer.ym, ...record }, now.toISOString());
  return { url: checkout.url };
}
