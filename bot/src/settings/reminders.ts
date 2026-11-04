// ⏰ The daily message: hour, time zone, pause and sound. Joining Spark starts it with today's message.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { findUser, updateUser } from "../users/repo.ts";
import { t, zoneName } from "../i18n/index.ts";
import { showScreen, sendText } from "../telegram/send.ts";
import { backRow, button } from "../menu/keyboards.ts";
import { DAILY_HOURS, isZone, ZONES } from "../config/zones.ts";
import { FREE_TRACK } from "../config/tracks.ts";
import { queueToday } from "../daily/schedule.ts";
import { drainOutbox } from "../outbox/drain.ts";
import type { InlineButton } from "../telegram/types.ts";

const HOURS_PER_ROW = 5;
const ZONES_PER_ROW = 2;
// A just-joined user's first message goes out right away; keep that short.
const JOIN_DRAIN_MS = 5_000;

export const formatHour = (hour: number): string => `${String(hour).padStart(2, "0")}:00`;

const chunk = <T>(items: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

function stateText(user: BotUser): string {
  if (user.dailyPaused) return t(user.lang, "statePaused");
  return t(user.lang, user.dailySilent ? "stateSilent" : "stateOn");
}

export async function showReminders(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const { lang } = user;
  if (!user.track) {
    await showScreen(ctx, user.telegramId, messageId, t(lang, "dailyNone"), { inline_keyboard: [[button(t(lang, "btnJoinSpark"), "join")], backRow(lang)] });
    return;
  }
  const text = t(lang, "remindersText", { hour: formatHour(user.dailyHour), zone: zoneName(lang, user.timeZone), state: stateText(user) });
  const keyboard = {
    inline_keyboard: [
      [button(t(lang, "btnHour"), "rem:hours"), button(t(lang, "btnZone"), "rem:zones")],
      [button(t(lang, user.dailyPaused ? "btnResume" : "btnPause"), "rem:pause"), button(t(lang, user.dailySilent ? "btnSound" : "btnSilent"), "rem:sound")],
      backRow(lang),
    ],
  };
  await showScreen(ctx, user.telegramId, messageId, text, keyboard);
}

async function showHours(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const rows: InlineButton[][] = chunk(DAILY_HOURS, HOURS_PER_ROW).map((row) => row.map((h) => button(`${h === user.dailyHour ? "✓ " : ""}${formatHour(h)}`, `rem:hour:${h}`)));
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, "pickHour"), { inline_keyboard: [...rows, backRow(user.lang, "reminders")] });
}

async function showZones(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const rows = chunk(ZONES, ZONES_PER_ROW).map((row) => row.map((z) => button(`${z === user.timeZone ? "✓ " : ""}${zoneName(user.lang, z)}`, `rem:zone:${z}`)));
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, "pickZone"), { inline_keyboard: [...rows, backRow(user.lang, "reminders")] });
}

/** Joins the free Spark track and sends today's message at once. */
export async function joinSpark(ctx: AppContext, user: BotUser): Promise<void> {
  if (user.track === FREE_TRACK) {
    await sendText(ctx, user.telegramId, t(user.lang, "sparkAlready", { hour: formatHour(user.dailyHour) }));
    return;
  }
  await updateUser(ctx.db, user.telegramId, { track: FREE_TRACK, trackDay: 1, lastDailyDate: null, dailyPaused: false }, ctx.nowIso);
  await sendText(ctx, user.telegramId, t(user.lang, "sparkJoined", { hour: formatHour(user.dailyHour) }));
  const joined = await findUser(ctx.db, user.telegramId);
  if (joined && (await queueToday(ctx, joined))) await drainOutbox(ctx, JOIN_DRAIN_MS);
}

/** Callback data "rem:<action>[:<value>]". */
export async function handleReminderAction(ctx: AppContext, user: BotUser, data: string, messageId: number | null): Promise<string | undefined> {
  const [, action, ...rest] = data.split(":");
  const value = rest.join(":");
  if (action === "hours") return void (await showHours(ctx, user, messageId));
  if (action === "zones") return void (await showZones(ctx, user, messageId));
  let patch: Parameters<typeof updateUser>[2] = {};
  if (action === "hour" && (DAILY_HOURS as readonly number[]).includes(Number(value))) patch = { dailyHour: Number(value) };
  else if (action === "zone" && isZone(value)) patch = { timeZone: value };
  else if (action === "pause") patch = { dailyPaused: !user.dailyPaused };
  else if (action === "sound") patch = { dailySilent: !user.dailySilent };
  else return undefined;
  await updateUser(ctx.db, user.telegramId, patch, ctx.nowIso);
  await showReminders(ctx, { ...user, ...patch }, messageId);
  return t(user.lang, "saved");
}
