// The bot_outbox table: queued messages, sent by the cron at a paced rate.
import { parsePayload, type OutboxItem, type OutboxPayload } from "./types.ts";

export async function enqueue(db: D1Database, item: { telegramId: number; payload: OutboxPayload; sendAfter: number; dedupeKey: string | null }, now: string): Promise<boolean> {
  const result = await db.prepare("INSERT OR IGNORE INTO bot_outbox (telegram_id, kind, payload, send_after, dedupe_key, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(item.telegramId, item.payload.kind, JSON.stringify(item.payload), item.sendAfter, item.dedupeKey, now).run();
  return result.meta.changes === 1;
}

export async function listDue(db: D1Database, nowSeconds: number, limit: number): Promise<OutboxItem[]> {
  const { results } = await db.prepare("SELECT id, telegram_id, payload, attempts FROM bot_outbox WHERE done_at IS NULL AND send_after <= ? ORDER BY send_after, id LIMIT ?")
    .bind(nowSeconds, limit).all<{ id: number; telegram_id: number; payload: string; attempts: number }>();
  return results.flatMap((r) => {
    const payload = parsePayload(r.payload);
    return payload ? [{ id: r.id, telegramId: r.telegram_id, payload, attempts: r.attempts }] : [];
  });
}

/** Sent or given up. */
export async function finish(db: D1Database, id: number, now: string): Promise<void> {
  await db.prepare("UPDATE bot_outbox SET done_at = ? WHERE id = ?").bind(now, id).run();
}

export async function retryLater(db: D1Database, id: number, sendAfter: number): Promise<void> {
  await db.prepare("UPDATE bot_outbox SET attempts = attempts + 1, send_after = ? WHERE id = ?").bind(sendAfter, id).run();
}

/** Housekeeping: finished rows older than the dedupe horizon. */
export async function purgeFinished(db: D1Database, before: string): Promise<void> {
  await db.prepare("DELETE FROM bot_outbox WHERE done_at IS NOT NULL AND created_at < ?").bind(before).run();
}
