// Customer numbers in the support center: the internal ym number (store customers table, read-only) on the user card,
// and a search by ym number, name, @username or Telegram id. The number is never shown to customers.
import type { AppContext } from "../app/context.ts";
import { HttpError } from "../http/errors.ts";
import { displayName, fromRow } from "../users/repo.ts";

const MAX_RESULTS = 20;
const MAX_QUERY = 64;
const YM = /^ym\d{1,}$/i;
const DIGITS = /^\d+$/;

export interface CustomerHit { id: number; name: string; username: string | null; ym: string | null; threadId: number | null }

export async function findYm(db: D1Database, telegramId: number): Promise<string | null> {
  return (await db.prepare("SELECT ym FROM customers WHERE telegram_id = ?").bind(telegramId).first<{ ym: string | null }>())?.ym ?? null;
}

/** Which column a query searches: a ym number, a Telegram id, or a name / @username (pure). */
export function queryKind(q: string): "ym" | "telegram" | "name" {
  if (YM.test(q)) return "ym";
  return DIGITS.test(q) ? "telegram" : "name";
}

const SELECT = `SELECT u.*, c.ym, (SELECT MAX(t.id) FROM bot_threads t WHERE t.telegram_id = u.telegram_id) AS thread_id
  FROM bot_users u LEFT JOIN customers c ON c.telegram_id = u.telegram_id`;

export async function searchCustomers(request: Request, ctx: AppContext): Promise<{ results: CustomerHit[] }> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim().replace(/^@/, "");
  if (!q || q.length > MAX_QUERY) throw new HttpError("bad_request", `q must be 1–${MAX_QUERY} characters`);
  const kind = queryKind(q);
  const where = kind === "ym" ? "c.ym = ?1" : kind === "telegram" ? "u.telegram_id = CAST(?1 AS INTEGER)"
    : "(u.first_name LIKE ?1 OR u.last_name LIKE ?1 OR u.username LIKE ?1)";
  const value = kind === "ym" ? q.toLowerCase() : kind === "name" ? `%${q.replace(/[%_]/g, "")}%` : q;
  const { results } = await ctx.db.prepare(`${SELECT} WHERE ${where} ORDER BY u.created_at DESC LIMIT ${MAX_RESULTS}`).bind(value)
    .all<Parameters<typeof fromRow>[0] & { ym: string | null; thread_id: number | null }>();
  return { results: results.map((r) => {
    const user = fromRow(r);
    return { id: user.telegramId, name: displayName(user), username: user.username, ym: r.ym, threadId: r.thread_id };
  }) };
}
