// What a customer owns, for the personal area: orders, files and memberships. An order is the customer's when
// its checkout carries their ym number, or when Polar reports it for their Polar customer (e.g. renewals).
export interface AccountOrder { id: string; status: string; currency: string; totalAmount: number; itemIds: string[]; createdAt: string }
export interface AccountSubscription {
  id: string; planId: string | null; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; amount: number | null; currency: string | null;
}
export interface Owner { ym: string; polarCustomerId: string | null }

// Order statuses that are a completed sale (an invoice exists or can be made).
const SOLD = "('paid', 'refunded', 'partially_refunded')";
const OWNED_ORDERS = `FROM orders o LEFT JOIN checkouts c ON c.id = o.checkout_id WHERE (c.customer_ym = ?1 OR (?2 IS NOT NULL AND o.customer_id = ?2))`;

export async function listOrders(db: D1Database, owner: Owner): Promise<AccountOrder[]> {
  const { results } = await db.prepare(`SELECT o.id, o.status, o.currency, o.total_amount, o.item_ids, o.created_at ${OWNED_ORDERS} AND o.status IN ${SOLD}
    ORDER BY o.created_at DESC`).bind(owner.ym, owner.polarCustomerId)
    .all<{ id: string; status: string; currency: string; total_amount: number; item_ids: string; created_at: string }>();
  return results.map((r) => ({ id: r.id, status: r.status, currency: r.currency, totalAmount: r.total_amount, itemIds: r.item_ids.split(",").filter(Boolean), createdAt: r.created_at }));
}

export async function findOrderOf(db: D1Database, owner: Owner, orderId: string): Promise<AccountOrder | null> {
  return (await listOrders(db, owner)).find((o) => o.id === orderId) ?? null;
}

/** Every product the customer may download, newest purchase first, once each. */
export async function listOwnedProducts(db: D1Database, owner: Owner): Promise<string[]> {
  const { results } = await db.prepare(`SELECT e.product_id, MAX(e.created_at) AS at FROM entitlements e
    WHERE e.revoked_at IS NULL AND e.order_id IN (SELECT o.id ${OWNED_ORDERS}) GROUP BY e.product_id ORDER BY at DESC`)
    .bind(owner.ym, owner.polarCustomerId).all<{ product_id: string }>();
  return results.map((r) => r.product_id);
}

interface SubscriptionDbRow { id: string; plan_id: string | null; status: string; current_period_end: string | null; cancel_at_period_end: number; amount: number | null; currency: string | null }
const fromSubscription = (r: SubscriptionDbRow): AccountSubscription => ({
  id: r.id, planId: r.plan_id, status: r.status, currentPeriodEnd: r.current_period_end, cancelAtPeriodEnd: r.cancel_at_period_end === 1, amount: r.amount, currency: r.currency,
});
const SUBSCRIPTION_COLUMNS = "id, plan_id, status, current_period_end, cancel_at_period_end, amount, currency";

export async function listSubscriptions(db: D1Database, polarCustomerId: string | null): Promise<AccountSubscription[]> {
  if (!polarCustomerId) return [];
  const { results } = await db.prepare(`SELECT ${SUBSCRIPTION_COLUMNS} FROM subscriptions WHERE customer_id = ? ORDER BY updated_at DESC`)
    .bind(polarCustomerId).all<SubscriptionDbRow>();
  return results.map(fromSubscription);
}

export async function findSubscriptionOf(db: D1Database, polarCustomerId: string | null, subscriptionId: string): Promise<AccountSubscription | null> {
  if (!polarCustomerId) return null;
  const row = await db.prepare(`SELECT ${SUBSCRIPTION_COLUMNS} FROM subscriptions WHERE id = ? AND customer_id = ?`).bind(subscriptionId, polarCustomerId).first<SubscriptionDbRow>();
  return row ? fromSubscription(row) : null;
}
