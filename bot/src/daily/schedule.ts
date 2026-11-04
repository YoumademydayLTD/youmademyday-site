// Cron: queues today's message for every user whose local hour has come, in tracks they may receive.
import type { AppContext } from "../app/context.ts";
import { canReceive, findTrack } from "../config/tracks.ts";
import { activePlanIds } from "../billing/subscriptions.ts";
import { enqueue } from "../outbox/repo.ts";
import { listDailyCandidates, updateUser, type BotUser } from "../users/repo.ts";
import { findDayContent } from "../content/repo.ts";
import { isDailyDue, localTime } from "./clock.ts";

async function mayReceive(ctx: AppContext, user: BotUser, trackId: string): Promise<boolean> {
  const track = findTrack(trackId);
  if (!track) return false;
  return canReceive(track, track.plans.length ? await activePlanIds(ctx.db, user.telegramId) : []);
}

/** Queues the user's next day now, and moves them on. Returns false when the track has no message for that day. */
export async function queueToday(ctx: AppContext, user: BotUser): Promise<boolean> {
  if (!user.track || !(await mayReceive(ctx, user, user.track))) return false;
  const today = localTime(ctx.now, user.timeZone).date;
  // The track has no message for this day yet (or it ended): try again tomorrow, without moving on.
  if (!(await findDayContent(ctx.db, user.track, user.trackDay, user.lang))) {
    await updateUser(ctx.db, user.telegramId, { lastDailyDate: today }, ctx.nowIso);
    return false;
  }
  await enqueue(ctx.db, { telegramId: user.telegramId, payload: { kind: "daily", track: user.track, day: user.trackDay }, sendAfter: ctx.nowSeconds, dedupeKey: `daily:${user.telegramId}:${today}` }, ctx.nowIso);
  await updateUser(ctx.db, user.telegramId, { lastDailyDate: today, trackDay: user.trackDay + 1 }, ctx.nowIso);
  return true;
}

export async function scheduleDaily(ctx: AppContext): Promise<number> {
  let queued = 0;
  for (const user of await listDailyCandidates(ctx.db)) {
    const schedule = { timeZone: user.timeZone, dailyHour: user.dailyHour, lastDailyDate: user.lastDailyDate, isPaused: user.dailyPaused };
    if (isDailyDue(schedule, ctx.now) && (await queueToday(ctx, user))) queued += 1;
  }
  return queued;
}
