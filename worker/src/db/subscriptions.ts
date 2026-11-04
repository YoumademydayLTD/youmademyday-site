// The subscriptions table: the latest state of each membership.
export interface SubscriptionRow {
  id: string;
  customerId: string | null;
  customerEmail: string | null;
  productId: string | null;
  planId: string | null;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  endedAt: string | null;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, string>;
  checkoutId: string | null;
}

export async function upsertSubscription(db: D1Database, row: SubscriptionRow, now: string): Promise<void> {
  await db.prepare(
    `INSERT INTO subscriptions (id, customer_id, customer_email, product_id, plan_id, status, current_period_end, cancel_at_period_end,
       canceled_at, ended_at, amount, currency, metadata, checkout_id, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status = excluded.status, current_period_end = excluded.current_period_end,
       cancel_at_period_end = excluded.cancel_at_period_end, canceled_at = excluded.canceled_at, ended_at = excluded.ended_at,
       amount = COALESCE(excluded.amount, subscriptions.amount), currency = COALESCE(excluded.currency, subscriptions.currency),
       customer_email = COALESCE(excluded.customer_email, subscriptions.customer_email),
       checkout_id = COALESCE(excluded.checkout_id, subscriptions.checkout_id), updated_at = excluded.updated_at`,
  ).bind(row.id, row.customerId, row.customerEmail, row.productId, row.planId, row.status, row.currentPeriodEnd, row.cancelAtPeriodEnd ? 1 : 0,
    row.canceledAt, row.endedAt, row.amount, row.currency, JSON.stringify(row.metadata), row.checkoutId, now).run();
}
