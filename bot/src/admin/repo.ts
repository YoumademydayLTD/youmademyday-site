// The bot_admins and bot_settings tables.
const CLAIMED_KEY = "admin_claimed_at";

export async function listAdminIds(db: D1Database): Promise<Set<number>> {
  const { results } = await db.prepare("SELECT telegram_id FROM bot_admins").all<{ telegram_id: number }>();
  return new Set(results.map((r) => r.telegram_id));
}

export async function isAdmin(db: D1Database, telegramId: number): Promise<boolean> {
  return (await db.prepare("SELECT 1 AS x FROM bot_admins WHERE telegram_id = ?").bind(telegramId).first()) !== null;
}

export async function isClaimed(db: D1Database): Promise<boolean> {
  return (await db.prepare("SELECT 1 AS x FROM bot_settings WHERE key = ?").bind(CLAIMED_KEY).first()) !== null;
}

/** Makes this user the admin and burns the claim code, once: a second claim finds the key already taken. */
export async function claimAdmin(db: D1Database, telegramId: number, now: string): Promise<boolean> {
  const burn = await db.prepare("INSERT OR IGNORE INTO bot_settings (key, value) VALUES (?, ?)").bind(CLAIMED_KEY, now).run();
  if (burn.meta.changes !== 1) return false;
  await db.prepare("INSERT OR IGNORE INTO bot_admins (telegram_id, claimed_at) VALUES (?, ?)").bind(telegramId, now).run();
  return true;
}
