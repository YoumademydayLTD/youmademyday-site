// The site's daily companion (signed in with the site session): GET /api/companion, POST /api/companion/done,
// /settings and /track. Same rows as the bot, so the streak and settings are one, wherever they change.
import type { AppContext } from "../app/context.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject } from "../http/response.ts";
import { bearerToken, findSession } from "../sessions/repo.ts";
import { findUser, updateUser, type BotUser } from "../users/repo.ts";
import { DEFAULT_LANG } from "../config/langs.ts";
import { canReceive, findTrack } from "../config/tracks.ts";
import { activePlanIds } from "../billing/subscriptions.ts";
import { localTime } from "../daily/clock.ts";
import { recordDone } from "../daily/streak.ts";
import { historyDays, parseSettings, settingsOf, todayDay, trackChoices } from "./view.ts";

async function siteUser(request: Request, ctx: AppContext): Promise<BotUser> {
  const session = await findSession(ctx.db, bearerToken(request), ctx.nowSeconds);
  if (!session || session.scope !== "site") throw new HttpError("unauthorized", "not signed in");
  const user = await findUser(ctx.db, session.telegramId);
  if (!user) throw new HttpError("unauthorized", "not signed in");
  return user;
}

/** Messages of these days in the user's language, else English (as the bot sends them). */
async function dayTexts(ctx: AppContext, user: BotUser, days: number[]): Promise<Map<number, { text: string; lessonUrl: string | null; lessonLabel: string | null }>> {
  const texts = new Map<number, { text: string; lessonUrl: string | null; lessonLabel: string | null; isOwnLang: boolean }>();
  if (!user.track || !days.length) return texts;
  const { results } = await ctx.db.prepare(`SELECT day_n, lang, text, lesson_url, lesson_label FROM bot_content WHERE track = ? AND lang IN (?, ?)
    AND day_n BETWEEN ? AND ?`).bind(user.track, user.lang, DEFAULT_LANG, Math.min(...days), Math.max(...days))
    .all<{ day_n: number; lang: string; text: string; lesson_url: string | null; lesson_label: string | null }>();
  for (const r of results) {
    const isOwnLang = r.lang === user.lang;
    if (!days.includes(r.day_n) || (texts.get(r.day_n)?.isOwnLang && !isOwnLang)) continue;
    texts.set(r.day_n, { text: r.text, lessonUrl: r.lesson_url, lessonLabel: r.lesson_label, isOwnLang });
  }
  return texts;
}

async function companionOf(ctx: AppContext, user: BotUser): Promise<unknown> {
  const today = todayDay(user);
  const past = historyDays(today);
  const texts = await dayTexts(ctx, user, today ? [today, ...past] : []);
  const todayText = today ? texts.get(today) : undefined;
  return {
    track: user.track,
    tracks: trackChoices(await activePlanIds(ctx.db, user.telegramId)),
    today: today && todayText ? { dayN: today, text: todayText.text, lessonUrl: todayText.lessonUrl, lessonLabel: todayText.lessonLabel } : null,
    history: past.flatMap((dayN) => { const t = texts.get(dayN); return t ? [{ dayN, text: t.text }] : []; }),
    streak: user.streak,
    doneToday: user.lastDoneDate === localTime(ctx.now, user.timeZone).date,
    settings: settingsOf(user),
  };
}

export async function getCompanion(request: Request, ctx: AppContext): Promise<unknown> {
  return companionOf(ctx, await siteUser(request, ctx));
}

/** Same rule as the bot's «✓ done»: one per local day, consecutive days grow the streak. */
export async function postCompanionDone(request: Request, ctx: AppContext): Promise<unknown> {
  const user = await siteUser(request, ctx);
  const next = recordDone({ streak: user.streak, lastDoneDate: user.lastDoneDate }, localTime(ctx.now, user.timeZone).date);
  if (next.isNew) await updateUser(ctx.db, user.telegramId, { streak: next.streak, lastDoneDate: next.lastDoneDate }, ctx.nowIso);
  return { streak: next.streak, doneToday: true };
}

export async function postCompanionSettings(request: Request, ctx: AppContext): Promise<unknown> {
  const user = await siteUser(request, ctx);
  const patch = parseSettings(await readJsonObject(request));
  if (!patch) throw new HttpError("bad_request", "dailyHour must be 0–23; paused and silent must be true or false");
  await updateUser(ctx.db, user.telegramId, patch, ctx.nowIso);
  return { settings: settingsOf({ ...user, ...patch }) };
}

export async function postCompanionTrack(request: Request, ctx: AppContext): Promise<unknown> {
  const user = await siteUser(request, ctx);
  const body = await readJsonObject(request);
  const track = typeof body.track === "string" ? findTrack(body.track) : undefined;
  if (!track) throw new HttpError("bad_request", "unknown track");
  if (!canReceive(track, await activePlanIds(ctx.db, user.telegramId))) throw new HttpError("forbidden", "this track needs a membership");
  if (user.track !== track.id) {
    await updateUser(ctx.db, user.telegramId, { track: track.id, trackDay: 1, lastDailyDate: null, dailyPaused: false }, ctx.nowIso);
  }
  return companionOf(ctx, { ...user, track: track.id, trackDay: user.track === track.id ? user.trackDay : 1, lastDailyDate: user.track === track.id ? user.lastDailyDate : null });
}
