// GET /api/links/:id/charges: server to server, the same bearer secret as the other link endpoints (added 16.11.2026).
// Every charge a link led to, newest first, so a link caller can show its buyer a billing history: the one-time
// purchase, or a membership's first charge and each weekly renewal after it. A free day charges nothing and is not a
// charge. Amounts are in currency units, as the link endpoints take and give them.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { findLinkFacts } from "../db/links.ts";
import { assertAuthorized } from "./auth.ts";

const MINOR_UNITS = 100;

export interface LinkCharge {
  id: string; // the order id
  charged_at: string; // ISO time
  amount: number;
  refunded_amount: number;
  currency: string;
  status: "paid" | "refunded" | "partially_refunded";
}

interface ChargeDbRow { id: string; created_at: string; total_amount: number; refunded_amount: number; currency: string; status: LinkCharge["status"] }

/** The charges of one link: orders of its checkout, and of the membership it started. */
export async function findLinkCharges(db: D1Database, checkoutId: string, subscriptionId: string | null): Promise<LinkCharge[]> {
  const { results } = await db.prepare(`SELECT id, created_at, total_amount, refunded_amount, currency, status FROM orders
    WHERE (checkout_id = ?1 OR (?2 IS NOT NULL AND subscription_id = ?2)) AND status IN ('paid', 'refunded', 'partially_refunded')
      AND total_amount > 0 ORDER BY created_at DESC`).bind(checkoutId, subscriptionId).all<ChargeDbRow>();
  return results.map((row) => ({
    id: row.id, charged_at: row.created_at, amount: row.total_amount / MINOR_UNITS, refunded_amount: row.refunded_amount / MINOR_UNITS,
    currency: row.currency, status: row.status,
  }));
}

export async function handleLinkCharges(request: Request, env: Env, checkoutId: string): Promise<{ id: string; charges: LinkCharge[] }> {
  assertAuthorized(request.headers.get("Authorization"), env.YMD_LINKS_SECRET);
  const facts = await findLinkFacts(env.DB, checkoutId);
  if (!facts) throw new HttpError("not_found", `no CRX link ${checkoutId}`);
  return { id: checkoutId, charges: await findLinkCharges(env.DB, checkoutId, facts.subscription?.id ?? null) };
}
