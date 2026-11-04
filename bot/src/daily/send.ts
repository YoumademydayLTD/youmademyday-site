// Sends one queued daily, evening or charge message (used by the outbox drain).
import type { AppContext } from "../app/context.ts";
import { findDayContent } from "../content/repo.ts";
import { t } from "../i18n/index.ts";
import { escapeHtml, planName } from "../i18n/index.ts";
import { sendText } from "../telegram/send.ts";
import type { OutboxPayload } from "../outbox/types.ts";
import type { BotUser } from "../users/repo.ts";
import { dailyKeyboard } from "./message.ts";
import { formatCharge } from "../billing/charge-format.ts";

/** False when there is nothing to send any more (no content for that day). */
export async function sendQueued(ctx: AppContext, user: BotUser, payload: OutboxPayload): Promise<boolean> {
  if (payload.kind === "charge") {
    const { date, amount } = formatCharge(user.lang, payload.periodEnd, payload.amount, payload.currency);
    await sendText(ctx, user.telegramId, t(user.lang, "chargeReminder", { date, amount, plan: escapeHtml(planName(user.lang, payload.planId)) }));
    return true;
  }
  const content = await findDayContent(ctx.db, payload.track, payload.day, user.lang);
  if (!content) return false;
  const isEvening = payload.kind === "evening";
  const text = isEvening ? `${t(user.lang, "eveningLead")}\n\n${content.text}` : content.text;
  await sendText(ctx, user.telegramId, text, { keyboard: dailyKeyboard(user.lang, content, !isEvening), isSilent: user.dailySilent });
  return true;
}
