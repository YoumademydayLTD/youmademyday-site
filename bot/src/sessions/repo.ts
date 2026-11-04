// Sessions for the site and the support center. Only a SHA-256 of the token is stored.
import { randomToken, sha256Hex } from "../http/crypto.ts";
import { SECONDS_PER_DAY } from "../config/time.ts";

export type Scope = "site" | "admin";
export const SESSION_TTL_SECONDS: Record<Scope, number> = { site: 30 * SECONDS_PER_DAY, admin: 14 * SECONDS_PER_DAY };
export interface Session { telegramId: number; scope: Scope; expiresAt: number }

export async function createSession(db: D1Database, telegramId: number, scope: Scope, nowSeconds: number, now: string): Promise<{ token: string; expiresAt: number }> {
  const token = randomToken(32);
  const expiresAt = nowSeconds + SESSION_TTL_SECONDS[scope];
  await db.prepare("INSERT INTO bot_sessions (token_hash, telegram_id, scope, expires_at, created_at) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256Hex(token), telegramId, scope, expiresAt, now).run();
  return { token, expiresAt };
}

export async function findSession(db: D1Database, token: string, nowSeconds: number): Promise<Session | null> {
  if (!token) return null;
  const row = await db.prepare("SELECT telegram_id, scope, expires_at FROM bot_sessions WHERE token_hash = ? AND expires_at > ?")
    .bind(await sha256Hex(token), nowSeconds).first<{ telegram_id: number; scope: Scope; expires_at: number }>();
  return row ? { telegramId: row.telegram_id, scope: row.scope, expiresAt: row.expires_at } : null;
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
  await db.prepare("DELETE FROM bot_sessions WHERE token_hash = ?").bind(await sha256Hex(token)).run();
}

export async function purgeSessions(db: D1Database, nowSeconds: number): Promise<void> {
  await db.prepare("DELETE FROM bot_sessions WHERE expires_at < ?").bind(nowSeconds).run();
}

/** The bearer token of a request, if any. */
export function bearerToken(request: Request): string {
  const header = request.headers.get("Authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}
