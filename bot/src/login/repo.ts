// The bot_logins and bot_login_attempts tables.
import { FAILED_CODE_WINDOW_SECONDS, type LoginRecord } from "./lifecycle.ts";

interface Row { id: string; kind: "link" | "code"; scope: "site" | "admin"; telegram_id: number | null; status: "pending" | "confirmed" | "used"; expires_at: number }
const fromRow = (row: Row): LoginRecord => ({ id: row.id, kind: row.kind, scope: row.scope, telegramId: row.telegram_id, status: row.status, expiresAt: row.expires_at });

export async function insertLogin(db: D1Database, record: LoginRecord, now: string): Promise<boolean> {
  const result = await db.prepare("INSERT OR IGNORE INTO bot_logins (id, kind, scope, telegram_id, status, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(record.id, record.kind, record.scope, record.telegramId, record.status, record.expiresAt, now).run();
  return result.meta.changes === 1;
}

export async function findLogin(db: D1Database, id: string): Promise<LoginRecord | null> {
  const row = await db.prepare("SELECT id, kind, scope, telegram_id, status, expires_at FROM bot_logins WHERE id = ?").bind(id).first<Row>();
  return row ? fromRow(row) : null;
}

/** Moves a login from one status to the next only if nobody else did first (single use under concurrency). */
export async function transitionLogin(db: D1Database, id: string, from: LoginRecord["status"], to: LoginRecord["status"], telegramId: number | null): Promise<boolean> {
  const result = await db.prepare("UPDATE bot_logins SET status = ?, telegram_id = COALESCE(?, telegram_id) WHERE id = ? AND status = ?")
    .bind(to, telegramId, id, from).run();
  return result.meta.changes === 1;
}

export async function countFailedCodes(db: D1Database, client: string, nowSeconds: number): Promise<number> {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM bot_login_attempts WHERE client = ? AND at > ?")
    .bind(client, nowSeconds - FAILED_CODE_WINDOW_SECONDS).first<{ n: number }>();
  return row?.n ?? 0;
}

export async function recordFailedCode(db: D1Database, client: string, nowSeconds: number): Promise<void> {
  await db.prepare("INSERT INTO bot_login_attempts (client, at) VALUES (?, ?)").bind(client, nowSeconds).run();
}

/** Housekeeping for the cron: expired logins and old attempts. */
export async function purgeLogins(db: D1Database, nowSeconds: number): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM bot_logins WHERE expires_at < ?").bind(nowSeconds - FAILED_CODE_WINDOW_SECONDS),
    db.prepare("DELETE FROM bot_login_attempts WHERE at < ?").bind(nowSeconds - FAILED_CODE_WINDOW_SECONDS),
  ]);
}
