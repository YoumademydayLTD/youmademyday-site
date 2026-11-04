// «✓ done» records the streak; «remind me tonight» queues the same message for the evening.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { updateUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { enqueue } from "../outbox/repo.ts";
import { EVENING_FALLBACK_HOURS, EVENING_HOUR } from "../config/zones.ts";
import { eveningSendAt, localTime } from "./clock.ts";
import { recordDone } from "./streak.ts";
import { parseDayData } from "./message.ts";

const FIRST_DAY = 1;

/** Returns the short toast for the callback answer. */
export async function handleDone(ctx: AppContext, user: BotUser): Promise<string> {
  const today = localTime(ctx.now, user.timeZone).date;
  const next = recordDone({ streak: user.streak, lastDoneDate: user.lastDoneDate }, today);
  if (!next.isNew) return t(user.lang, "doneAgain");
  await updateUser(ctx.db, user.telegramId, { streak: next.streak, lastDoneDate: next.lastDoneDate }, ctx.nowIso);
  return next.streak === FIRST_DAY ? t(user.lang, "doneFirst") : t(user.lang, "doneStreak", { n: next.streak });
}

export async function handleLater(ctx: AppContext, user: BotUser, data: string): Promise<string | undefined> {
  const day = parseDayData(data);
  if (!day) return undefined;
  const today = localTime(ctx.now, user.timeZone).date;
  const sendAfter = eveningSendAt(ctx.now, user.timeZone, EVENING_HOUR, EVENING_FALLBACK_HOURS);
  await enqueue(ctx.db, { telegramId: user.telegramId, payload: { kind: "evening", ...day }, sendAfter, dedupeKey: `evening:${user.telegramId}:${today}` }, ctx.nowIso);
  return t(user.lang, "eveningSet");
}
