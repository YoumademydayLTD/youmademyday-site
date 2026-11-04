// The checkouts table: one row per Polar checkout we opened (or saw in a webhook).
export interface CheckoutRow {
  id: string;
  source: "site" | "crx" | "polar";
  kind: string;
  itemIds: string[];
  lang: string | null;
  currency: string;
  amount: number;
  polarProductId: string;
  status: string;
  metadata: Record<string, string>;
  customerYm?: string | null;
}

const INSERT = `INSERT INTO checkouts (id, source, kind, item_ids, lang, currency, amount, polar_product_id, status, metadata, customer_ym, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const values = (row: CheckoutRow, now: string) =>
  [row.id, row.source, row.kind, row.itemIds.join(","), row.lang, row.currency, row.amount, row.polarProductId, row.status, JSON.stringify(row.metadata), row.customerYm ?? null, now, now];

export interface CheckoutItems { itemIds: string[]; lang: string | null; source: string }

/** The items, language and source we recorded for a checkout, if we opened it. */
export async function findCheckoutItems(db: D1Database, id: string): Promise<CheckoutItems | null> {
  const row = await db.prepare("SELECT item_ids, lang, source FROM checkouts WHERE id = ?").bind(id).first<{ item_ids: string; lang: string | null; source: string }>();
  return row ? { itemIds: row.item_ids.split(",").filter(Boolean), lang: row.lang, source: row.source } : null;
}

/** Our own record of a checkout we opened. Polar's checkout.created webhook can land first; our details then win, its status stays. */
export async function insertCheckout(db: D1Database, row: CheckoutRow, now: string): Promise<void> {
  await db.prepare(`${INSERT} ON CONFLICT(id) DO UPDATE SET source = excluded.source, kind = excluded.kind, item_ids = excluded.item_ids,
    lang = excluded.lang, currency = excluded.currency, amount = excluded.amount, polar_product_id = excluded.polar_product_id,
    metadata = excluded.metadata, customer_ym = COALESCE(excluded.customer_ym, checkouts.customer_ym)`).bind(...values(row, now)).run();
}

/** Status changes from checkout.* webhooks; a checkout opened elsewhere (Polar dashboard) is recorded too. */
export async function upsertCheckoutStatus(db: D1Database, row: CheckoutRow, now: string): Promise<void> {
  await db.prepare(`${INSERT} ON CONFLICT(id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`).bind(...values(row, now)).run();
}
