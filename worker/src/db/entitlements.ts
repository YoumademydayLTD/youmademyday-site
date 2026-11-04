// The entitlements table: what each paid order delivers, and the order lookups delivery needs.
export interface Grant { orderId: string; checkoutId: string | null; customerId: string | null; customerEmail: string | null; lang: string; productIds: string[] }
export interface OrderStatus { id: string; status: string; lang: string | null }
export interface Entitlement { productId: string; lang: string }

export async function grantEntitlements(db: D1Database, grant: Grant, now: string): Promise<void> {
  if (!grant.productIds.length) return;
  const insert = db.prepare(
    `INSERT INTO entitlements (order_id, checkout_id, customer_id, customer_email, product_id, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id, product_id) DO UPDATE SET revoked_at = NULL`,
  );
  await db.batch(grant.productIds.map((id) => insert.bind(grant.orderId, grant.checkoutId, grant.customerId, grant.customerEmail, id, grant.lang, now)));
}

export async function revokeEntitlements(db: D1Database, orderId: string, now: string): Promise<void> {
  await db.prepare("UPDATE entitlements SET revoked_at = ? WHERE order_id = ? AND revoked_at IS NULL").bind(now, orderId).run();
}

/** The newest order of a checkout (one checkout makes one order). */
export async function findOrderByCheckout(db: D1Database, checkoutId: string): Promise<OrderStatus | null> {
  return db.prepare("SELECT id, status, lang FROM orders WHERE checkout_id = ? ORDER BY created_at DESC LIMIT 1").bind(checkoutId).first<OrderStatus>();
}

export async function findOrder(db: D1Database, orderId: string): Promise<OrderStatus | null> {
  return db.prepare("SELECT id, status, lang FROM orders WHERE id = ?").bind(orderId).first<OrderStatus>();
}

export async function listEntitlements(db: D1Database, orderId: string): Promise<Entitlement[]> {
  const { results } = await db.prepare("SELECT product_id AS productId, lang FROM entitlements WHERE order_id = ? AND revoked_at IS NULL ORDER BY rowid")
    .bind(orderId).all<Entitlement>();
  return results;
}
