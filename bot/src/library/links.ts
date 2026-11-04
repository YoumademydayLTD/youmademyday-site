// The bot_order_links table: which Telegram user an order belongs to (first link wins).
export interface OrderLink { checkoutId: string; telegramId: number; orderId: string | null; deliveredAt: string | null; linkedAt: string }

interface Row { checkout_id: string; telegram_id: number; order_id: string | null; delivered_at: string | null; linked_at: string }
const fromRow = (r: Row): OrderLink => ({ checkoutId: r.checkout_id, telegramId: r.telegram_id, orderId: r.order_id, deliveredAt: r.delivered_at, linkedAt: r.linked_at });

export type LinkOutcome = "linked" | "same-user" | "other-user";

/** Links a checkout to this user unless another user linked it first (a checkout id is the buyer's private key). */
export async function linkOrder(db: D1Database, checkoutId: string, telegramId: number, now: string): Promise<LinkOutcome> {
  const insert = await db.prepare("INSERT OR IGNORE INTO bot_order_links (checkout_id, telegram_id, linked_at) VALUES (?, ?, ?)").bind(checkoutId, telegramId, now).run();
  if (insert.meta.changes === 1) return "linked";
  const owner = await db.prepare("SELECT telegram_id FROM bot_order_links WHERE checkout_id = ?").bind(checkoutId).first<{ telegram_id: number }>();
  return owner?.telegram_id === telegramId ? "same-user" : "other-user";
}

export async function markDelivered(db: D1Database, checkoutId: string, orderId: string, now: string): Promise<void> {
  await db.prepare("UPDATE bot_order_links SET order_id = ?, delivered_at = ? WHERE checkout_id = ?").bind(orderId, now, checkoutId).run();
}

export async function listUserLinks(db: D1Database, telegramId: number): Promise<OrderLink[]> {
  const { results } = await db.prepare("SELECT * FROM bot_order_links WHERE telegram_id = ? ORDER BY linked_at DESC").bind(telegramId).all<Row>();
  return results.map(fromRow);
}

/** Linked orders whose files were not sent yet (the payment was still pending), for the cron to retry. */
export async function listUndelivered(db: D1Database, linkedSince: string, limit: number): Promise<OrderLink[]> {
  const { results } = await db.prepare("SELECT * FROM bot_order_links WHERE delivered_at IS NULL AND linked_at > ? ORDER BY linked_at LIMIT ?")
    .bind(linkedSince, limit).all<Row>();
  return results.map(fromRow);
}
