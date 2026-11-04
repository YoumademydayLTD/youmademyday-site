// /delete: after a confirm, removes the user's bot data. Store order and payment records stay (the law requires
// them); deleting the order links only unlinks them from this Telegram account. An active membership is handed
// to the admin to end without further charges (the bot cannot cancel payments itself).
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { displayName } from "../users/repo.ts";
import { escapeHtml, t } from "../i18n/index.ts";
import { sendText, showScreen } from "../telegram/send.ts";
import { button } from "../menu/keyboards.ts";
import { isActive, listUserSubscriptions } from "../billing/subscriptions.ts";
import { listAdminIds } from "../admin/repo.ts";
import { publish } from "../live/hub.ts";

export async function askDelete(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const keyboard = { inline_keyboard: [[button(t(user.lang, "deleteYes"), "del:yes"), button(t(user.lang, "deleteNo"), "del:no")]] };
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, "deleteAsk"), keyboard);
}

/** The statements that erase one user's bot data (kept pure-ish so the list is easy to review). */
export function deleteStatements(db: D1Database, telegramId: number): D1PreparedStatement[] {
  const threads = "SELECT id FROM bot_threads WHERE telegram_id = ?";
  return [
    db.prepare(`DELETE FROM bot_messages WHERE thread_id IN (${threads})`).bind(telegramId),
    db.prepare(`DELETE FROM bot_admin_notices WHERE thread_id IN (${threads})`).bind(telegramId),
    db.prepare("DELETE FROM bot_threads WHERE telegram_id = ?").bind(telegramId),
    db.prepare("DELETE FROM bot_outbox WHERE telegram_id = ?").bind(telegramId),
    db.prepare("DELETE FROM bot_sessions WHERE telegram_id = ?").bind(telegramId),
    db.prepare("DELETE FROM bot_logins WHERE telegram_id = ?").bind(telegramId),
    db.prepare("DELETE FROM bot_order_links WHERE telegram_id = ?").bind(telegramId),
    db.prepare("DELETE FROM bot_users WHERE telegram_id = ?").bind(telegramId),
  ];
}

async function handOverMemberships(ctx: AppContext, user: BotUser): Promise<void> {
  const active = (await listUserSubscriptions(ctx.db, user.telegramId)).filter(isActive);
  if (!active.length) return;
  const list = active.map((s) => `${escapeHtml(s.planId ?? "?")} (${escapeHtml(s.id)})`).join(", ");
  for (const adminId of await listAdminIds(ctx.db)) {
    await sendText(ctx, adminId, `🗑 <b>${escapeHtml(displayName(user))}</b> מחק/ה את החשבון בבוט, ויש מנוי פעיל: ${list}.\nצריך לסיים אותו בלי חיובים נוספים.`);
  }
}

export async function confirmDelete(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  await handOverMemberships(ctx, user);
  await ctx.db.batch(deleteStatements(ctx.db, user.telegramId));
  await ctx.tg.call("deleteMyCommands", { scope: { type: "chat", chat_id: user.telegramId } }).catch(() => undefined);
  await publish(ctx.env, { type: "deleted", userId: user.telegramId });
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, "deleteDone"), { inline_keyboard: [] });
}
