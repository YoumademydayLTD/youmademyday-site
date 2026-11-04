// Memberships in the bot: the plans screen lists the user's running memberships with a cancel button each
// (callbacks sub:ask:<id>, sub:yes:<id>, sub:no). The store worker does the cancel.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { escapeHtml, planName, t } from "../i18n/index.ts";
import { showScreen } from "../telegram/send.ts";
import { button } from "../menu/keyboards.ts";
import { formatDay } from "./charge-format.ts";
import { isActive, listUserSubscriptions, type UserSubscription } from "./subscriptions.ts";
import { canCancel, cancelQuestion, membershipLine } from "./membership-lines.ts";
import { cancelViaStore } from "./cancel.ts";
import type { InlineButton } from "../telegram/types.ts";

export async function activeMemberships(ctx: AppContext, user: BotUser): Promise<UserSubscription[]> {
  return (await listUserSubscriptions(ctx.db, user.telegramId)).filter(isActive);
}

/** Text and cancel buttons for the plans screen; empty when the user has no running membership. */
export function membershipBlock(user: BotUser, subs: UserSubscription[]): { text: string; rows: InlineButton[][] } {
  if (!subs.length) return { text: "", rows: [] };
  const text = `${t(user.lang, "subsTitle")}\n${subs.map((s) => `• ${escapeHtml(membershipLine(user.lang, s))}`).join("\n")}`;
  const rows = subs.filter(canCancel).map((s) => [button(t(user.lang, "subCancelButton", { plan: planName(user.lang, s.planId ?? "") }), `sub:ask:${s.id}`)]);
  return { text, rows };
}

async function askCancel(ctx: AppContext, user: BotUser, sub: UserSubscription, messageId: number | null): Promise<void> {
  const keyboard = { inline_keyboard: [[button(t(user.lang, "subCancelYes"), `sub:yes:${sub.id}`), button(t(user.lang, "subCancelNo"), "plans")]] };
  await showScreen(ctx, user.telegramId, messageId, escapeHtml(cancelQuestion(user.lang, sub)), keyboard);
}

async function doCancel(ctx: AppContext, user: BotUser, sub: UserSubscription, messageId: number | null): Promise<void> {
  const result = await cancelViaStore(ctx, user.telegramId, sub.id);
  const plan = planName(user.lang, sub.planId ?? "");
  const text = !result ? t(user.lang, "subCancelFailed")
    : result.cancelAtPeriodEnd && result.currentPeriodEnd ? t(user.lang, "subCanceledEnd", { plan, date: formatDay(user.lang, result.currentPeriodEnd) })
      : t(user.lang, "subCanceledNow", { plan });
  await showScreen(ctx, user.telegramId, messageId, escapeHtml(text), { inline_keyboard: [[button(t(user.lang, "back"), "plans")]] });
}

/** sub:ask:<id> and sub:yes:<id>; anything stale (already ending, not theirs) just reopens the plans screen. */
export async function handleMembershipAction(ctx: AppContext, user: BotUser, data: string, messageId: number | null, reopen: () => Promise<void>): Promise<void> {
  const [, step, id] = data.split(":");
  const sub = (await activeMemberships(ctx, user)).find((s) => s.id === id);
  if (!sub || !canCancel(sub)) return reopen();
  if (step === "ask") return askCancel(ctx, user, sub, messageId);
  if (step === "yes") return doCancel(ctx, user, sub, messageId);
  return reopen();
}
