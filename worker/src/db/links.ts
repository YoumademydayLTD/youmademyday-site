// What the store knows about one CRX link: its checkout row, the order it made and the membership it started.
import type { LinkFacts } from "../links/link-status.ts";

interface CheckoutDbRow {
  id: string; item_ids: string; currency: string; amount: number; polar_product_id: string; status: string; telegram_id: number | null;
}
interface SubscriptionDbRow { id: string; status: string; cancel_at_period_end: number; current_period_end: string | null }

/** Only checkouts CRX opened (source "crx"); null for any other id. */
export async function findLinkFacts(db: D1Database, checkoutId: string): Promise<LinkFacts | null> {
  const checkout = await db.prepare(`SELECT c.id, c.item_ids, c.currency, c.amount, c.polar_product_id, c.status, cu.telegram_id
    FROM checkouts c LEFT JOIN customers cu ON cu.ym = c.customer_ym WHERE c.id = ? AND c.source = 'crx'`).bind(checkoutId).first<CheckoutDbRow>();
  if (!checkout) return null;
  const order = await db.prepare("SELECT status, subscription_id FROM orders WHERE checkout_id = ? ORDER BY created_at DESC LIMIT 1")
    .bind(checkoutId).first<{ status: string; subscription_id: string | null }>();
  // A free-day membership may have no paid order yet, so it is found by its own checkout id too.
  const subscription = await db.prepare(`SELECT id, status, cancel_at_period_end, current_period_end FROM subscriptions
    WHERE checkout_id = ?1 OR (?2 IS NOT NULL AND id = ?2) ORDER BY updated_at DESC LIMIT 1`)
    .bind(checkoutId, order?.subscription_id ?? null).first<SubscriptionDbRow>();
  return {
    checkout: {
      id: checkout.id, itemIds: checkout.item_ids.split(",").filter(Boolean), currency: checkout.currency, amount: checkout.amount,
      polarProductId: checkout.polar_product_id, status: checkout.status, telegramId: checkout.telegram_id,
    },
    order: order ? { status: order.status } : null,
    subscription: subscription ? {
      id: subscription.id, status: subscription.status, cancelAtPeriodEnd: subscription.cancel_at_period_end === 1, currentPeriodEnd: subscription.current_period_end,
    } : null,
  };
}
