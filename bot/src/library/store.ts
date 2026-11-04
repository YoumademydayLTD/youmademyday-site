// What an order delivers comes from the store worker (its single source of truth): GET /api/downloads over the
// service binding returns the items with fresh signed links. The bot never writes store tables.
import type { AppContext } from "../app/context.ts";

export interface DownloadItem { id: string; title: string; url: string; filename: string; lang: string; size: number }
export type Downloads = { status: "pending" } | { status: "refunded" } | { status: "ready"; items: DownloadItem[]; documentUrl: string };

export async function fetchDownloads(ctx: AppContext, checkoutId: string): Promise<Downloads> {
  // The store builds its signed links from the request origin, so the URL carries its public address (STORE_URL).
  const response = await ctx.env.STORE.fetch(`${ctx.env.STORE_URL}/api/downloads?checkout=${encodeURIComponent(checkoutId)}`);
  if (!response.ok) throw new Error(`store downloads ${response.status}: ${(await response.text()).slice(0, 200)}`);
  return response.json<Downloads>();
}

/** The paid order of a checkout, read-only from the store's orders table. */
export async function findStoreOrder(db: D1Database, checkoutId: string): Promise<{ id: string; status: string } | null> {
  return db.prepare("SELECT id, status FROM orders WHERE checkout_id = ? ORDER BY created_at DESC LIMIT 1").bind(checkoutId).first();
}

/** R2 key of a delivered file, the store's rule (worker/src/delivery/items.ts: "<lang>/<product id>.pdf"). */
export const fileKey = (item: Pick<DownloadItem, "id" | "lang">): string => `${item.lang}/${item.id}.pdf`;
