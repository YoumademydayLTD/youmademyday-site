// What the site's daily companion shows (pure): which day is "today", the past days, and the user's settings.
import type { BotUser } from "../users/repo.ts";
import { TRACKS, canReceive, isFreeTrack } from "../config/tracks.ts";

export const HISTORY_DAYS = 60;
const LAST_HOUR = 23;

/** The last day the bot sent (track_day already moved past it); day 1 for someone who joined but got nothing yet. */
export function todayDay(user: Pick<BotUser, "track" | "trackDay" | "lastDailyDate">): number | null {
  if (!user.track) return null;
  const delivered = user.lastDailyDate ? user.trackDay - 1 : 0;
  return Math.max(delivered, 1);
}

/** Past days to list, newest first. */
export function historyDays(today: number | null): number[] {
  if (!today || today <= 1) return [];
  const first = Math.max(1, today - HISTORY_DAYS);
  return Array.from({ length: today - first }, (_, i) => today - 1 - i);
}

export const trackChoices = (activePlans: readonly string[]) =>
  TRACKS.map((track) => ({ id: track.id, isFree: isFreeTrack(track), canJoin: canReceive(track, activePlans) }));

export const settingsOf = (user: BotUser) => ({ dailyHour: user.dailyHour, timeZone: user.timeZone, paused: user.dailyPaused, silent: user.dailySilent });

/** Settings the site may change, checked (pure). */
export function parseSettings(body: Record<string, unknown>): { dailyHour?: number; dailyPaused?: boolean; dailySilent?: boolean } | null {
  const patch: { dailyHour?: number; dailyPaused?: boolean; dailySilent?: boolean } = {};
  if (body.dailyHour !== undefined) {
    if (typeof body.dailyHour !== "number" || !Number.isInteger(body.dailyHour) || body.dailyHour < 0 || body.dailyHour > LAST_HOUR) return null;
    patch.dailyHour = body.dailyHour;
  }
  if (body.paused !== undefined) { if (typeof body.paused !== "boolean") return null; patch.dailyPaused = body.paused; }
  if (body.silent !== undefined) { if (typeof body.silent !== "boolean") return null; patch.dailySilent = body.silent; }
  return patch;
}
