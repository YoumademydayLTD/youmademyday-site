// The reading_progress table: which lessons and chapters a user marked as done.
export async function listDoneUnits(db: D1Database, telegramId: number, productId: string): Promise<Set<number>> {
  const { results } = await db.prepare("SELECT unit_n FROM reading_progress WHERE telegram_id = ? AND product_id = ?").bind(telegramId, productId).all<{ unit_n: number }>();
  return new Set(results.map((r) => r.unit_n));
}

/** Done counts per product for one user. */
export async function doneCounts(db: D1Database, telegramId: number): Promise<Map<string, number>> {
  const { results } = await db.prepare("SELECT product_id, COUNT(*) AS n FROM reading_progress WHERE telegram_id = ? GROUP BY product_id").bind(telegramId).all<{ product_id: string; n: number }>();
  return new Map(results.map((r) => [r.product_id, r.n]));
}

export async function setUnitDone(db: D1Database, mark: { telegramId: number; productId: string; n: number; isDone: boolean }, now: string): Promise<void> {
  const statement = mark.isDone
    ? db.prepare("INSERT INTO reading_progress (telegram_id, product_id, unit_n, done_at) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING").bind(mark.telegramId, mark.productId, mark.n, now)
    : db.prepare("DELETE FROM reading_progress WHERE telegram_id = ? AND product_id = ? AND unit_n = ?").bind(mark.telegramId, mark.productId, mark.n);
  await statement.run();
}
