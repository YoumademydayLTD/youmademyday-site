// The bot_users table: one row per person who opened the bot.
import { DEFAULT_DAILY_HOUR, DEFAULT_ZONE } from "../config/zones.ts";
import { isLang, langFromTelegram, type Lang } from "../config/langs.ts";
import type { TgUser } from "../telegram/types.ts";

export interface BotUser {
  telegramId: number;
  firstName: string;
  lastName: string | null;
  username: string | null;
  lang: Lang;
  timeZone: string;
  dailyHour: number;
  dailyPaused: boolean;
  dailySilent: boolean;
  newsOptIn: boolean;
  track: string | null;
  trackDay: number;
  lastDailyDate: string | null;
  streak: number;
  lastDoneDate: string | null;
  isBlocked: boolean;
  createdAt: string;
}

interface Row {
  telegram_id: number; first_name: string; last_name: string | null; username: string | null; lang: string; time_zone: string;
  daily_hour: number; daily_paused: number; daily_silent: number; news_opt_in: number; track: string | null; track_day: number;
  last_daily_date: string | null; streak: number; last_done_date: string | null; is_blocked: number; created_at: string;
}

export function fromRow(row: Row): BotUser {
  return {
    telegramId: row.telegram_id, firstName: row.first_name, lastName: row.last_name, username: row.username,
    lang: isLang(row.lang) ? row.lang : langFromTelegram(row.lang), timeZone: row.time_zone, dailyHour: row.daily_hour,
    dailyPaused: row.daily_paused === 1, dailySilent: row.daily_silent === 1, newsOptIn: row.news_opt_in === 1, track: row.track,
    trackDay: row.track_day, lastDailyDate: row.last_daily_date, streak: row.streak, lastDoneDate: row.last_done_date,
    isBlocked: row.is_blocked === 1, createdAt: row.created_at,
  };
}

export const displayName = (user: Pick<BotUser, "firstName" | "lastName">): string => [user.firstName, user.lastName].filter(Boolean).join(" ");

export async function findUser(db: D1Database, telegramId: number): Promise<BotUser | null> {
  const row = await db.prepare("SELECT * FROM bot_users WHERE telegram_id = ?").bind(telegramId).first<Row>();
  return row ? fromRow(row) : null;
}

/** Creates the user on first contact (language from Telegram) and keeps the name current; the chosen language stays. */
export async function upsertUser(db: D1Database, from: TgUser, now: string): Promise<BotUser> {
  const lang = langFromTelegram(from.language_code);
  const row = await db.prepare(
    `INSERT INTO bot_users (telegram_id, first_name, last_name, username, lang, time_zone, daily_hour, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(telegram_id) DO UPDATE SET first_name = excluded.first_name, last_name = excluded.last_name,
       username = excluded.username, is_blocked = 0, updated_at = excluded.updated_at
     RETURNING *`,
  ).bind(from.id, from.first_name, from.last_name ?? null, from.username ?? null, lang, DEFAULT_ZONE[lang], DEFAULT_DAILY_HOUR, now, now).first<Row>();
  if (!row) throw new Error("upsertUser: no row returned");
  return fromRow(row);
}

export type UserPatch = Partial<Pick<BotUser, "lang" | "timeZone" | "dailyHour" | "dailyPaused" | "dailySilent" | "newsOptIn" | "track" | "trackDay" | "lastDailyDate" | "streak" | "lastDoneDate" | "isBlocked">>;

const COLUMNS: Record<keyof UserPatch, string> = {
  lang: "lang", timeZone: "time_zone", dailyHour: "daily_hour", dailyPaused: "daily_paused", dailySilent: "daily_silent",
  newsOptIn: "news_opt_in", track: "track", trackDay: "track_day", lastDailyDate: "last_daily_date", streak: "streak",
  lastDoneDate: "last_done_date", isBlocked: "is_blocked",
};

export async function updateUser(db: D1Database, telegramId: number, patch: UserPatch, now: string): Promise<void> {
  const entries = (Object.entries(patch) as [keyof UserPatch, UserPatch[keyof UserPatch]][]).filter(([, v]) => v !== undefined);
  if (!entries.length) return;
  const sets = entries.map(([k]) => `${COLUMNS[k]} = ?`).join(", ");
  const values = entries.map(([, v]) => (typeof v === "boolean" ? (v ? 1 : 0) : v ?? null));
  await db.prepare(`UPDATE bot_users SET ${sets}, updated_at = ? WHERE telegram_id = ?`).bind(...values, now, telegramId).run();
}

/** Users who may get a daily message now: in a track, not paused, not blocked. The due check per zone happens in code. */
export async function listDailyCandidates(db: D1Database): Promise<BotUser[]> {
  const { results } = await db.prepare("SELECT * FROM bot_users WHERE track IS NOT NULL AND daily_paused = 0 AND is_blocked = 0").all<Row>();
  return results.map(fromRow);
}
