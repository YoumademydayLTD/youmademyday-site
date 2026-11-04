// The webhook_events table: every delivery once, keyed by webhook-id so Polar's retries are ignored.

/** Store a delivery; false when this webhook-id was already received. */
export async function recordEvent(db: D1Database, event: { id: string; type: string; payload: string }, now: string): Promise<boolean> {
  const result = await db.prepare("INSERT OR IGNORE INTO webhook_events (id, type, received_at, payload) VALUES (?, ?, ?, ?)")
    .bind(event.id, event.type, now, event.payload).run();
  return result.meta.changes > 0;
}

export async function markProcessed(db: D1Database, id: string, now: string, error: string | null): Promise<void> {
  await db.prepare("UPDATE webhook_events SET processed_at = ?, error = ? WHERE id = ?").bind(now, error, id).run();
}
