// The orders table: paid, refunded and pending orders as Polar reports them.
export interface OrderRow {
  id: string;
  checkoutId: string | null;
  customerId: string | null;
  customerEmail: string | null;
  productId: string | null;
  subscriptionId: string | null;
  status: string;
  billingReason: string | null;
  currency: string;
  totalAmount: number;
  refundedAmount: number;
  itemIds: string[];
  lang: string | null;
  needsReview: boolean;
  metadata: Record<string, string>;
}

export async function upsertOrder(db: D1Database, row: OrderRow, now: string): Promise<void> {
  await db.prepare(
    `INSERT INTO orders (id, checkout_id, customer_id, customer_email, product_id, subscription_id, status, billing_reason, currency,
       total_amount, refunded_amount, item_ids, lang, needs_review, metadata, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status = excluded.status, refunded_amount = excluded.refunded_amount,
       customer_email = COALESCE(excluded.customer_email, orders.customer_email), updated_at = excluded.updated_at`,
  ).bind(row.id, row.checkoutId, row.customerId, row.customerEmail, row.productId, row.subscriptionId, row.status, row.billingReason, row.currency,
    row.totalAmount, row.refundedAmount, row.itemIds.join(","), row.lang, row.needsReview ? 1 : 0, JSON.stringify(row.metadata), now, now).run();
}

/** A completed sale (paid or refunded) by its Polar order id, for the order details document. */
export async function findSoldOrder(db: D1Database, orderId: string): Promise<{ id: string; status: string; currency: string; totalAmount: number; itemIds: string[]; lang: string | null; createdAt: string } | null> {
  const row = await db.prepare("SELECT id, status, currency, total_amount, item_ids, lang, created_at FROM orders WHERE id = ? AND status IN ('paid', 'refunded', 'partially_refunded')")
    .bind(orderId).first<{ id: string; status: string; currency: string; total_amount: number; item_ids: string; lang: string | null; created_at: string }>();
  return row ? { id: row.id, status: row.status, currency: row.currency, totalAmount: row.total_amount, itemIds: row.item_ids.split(",").filter(Boolean), lang: row.lang, createdAt: row.created_at } : null;
}
