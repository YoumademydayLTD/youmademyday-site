// A customer's purchases for the user card: their linked orders, read-only from the store's orders and
// entitlements tables, with titles from the store catalogue (data only, bundled at deploy).
import catalog from "../../../worker/src/catalog/catalog.json";

const PRODUCTS = catalog.products as Record<string, { title: string; titles?: Record<string, string> }>;

export interface Purchase { checkoutId: string; orderId: string | null; status: string; total: number; currency: string; items: { id: string; title: string }[]; linkedAt: string }

interface Row { checkout_id: string; linked_at: string; order_id: string | null; status: string | null; total_amount: number | null; currency: string | null; item_ids: string | null }

export async function listPurchases(db: D1Database, telegramId: number): Promise<Purchase[]> {
  const { results } = await db.prepare(
    `SELECT l.checkout_id, l.linked_at, o.id AS order_id, o.status, o.total_amount, o.currency,
       COALESCE(o.item_ids, c.item_ids) AS item_ids
     FROM bot_order_links l
     LEFT JOIN orders o ON o.checkout_id = l.checkout_id
     LEFT JOIN checkouts c ON c.id = l.checkout_id
     WHERE l.telegram_id = ? ORDER BY l.linked_at DESC`,
  ).bind(telegramId).all<Row>();
  return results.map((r) => ({
    checkoutId: r.checkout_id, orderId: r.order_id, status: r.status ?? "pending", total: r.total_amount ?? 0, currency: r.currency ?? "ils", linkedAt: r.linked_at,
    items: (r.item_ids ?? "").split(",").filter(Boolean).map((id) => ({ id, title: PRODUCTS[id]?.titles?.he ?? PRODUCTS[id]?.title ?? id })),
  }));
}
