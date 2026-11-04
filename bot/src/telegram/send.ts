// Sending helpers: HTML text with an inline keyboard, edits, callback answers. A user who blocked the bot is
// marked, so the cron stops writing to them.
import type { AppContext } from "../app/context.ts";
import { TelegramError } from "./api.ts";
import type { InlineKeyboard, TgMessage } from "./types.ts";

export interface SendOptions { keyboard?: InlineKeyboard; isSilent?: boolean; replyTo?: number }

export async function sendText(ctx: AppContext, chatId: number, text: string, options: SendOptions = {}): Promise<TgMessage> {
  return ctx.tg.call<TgMessage>("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(options.keyboard ? { reply_markup: options.keyboard } : {}),
    ...(options.isSilent ? { disable_notification: true } : {}),
    ...(options.replyTo ? { reply_parameters: { message_id: options.replyTo, allow_sending_without_reply: true } } : {}),
  });
}

/** Replaces a menu message in place (callback buttons); falls back to a new message when it cannot be edited. */
export async function showScreen(ctx: AppContext, chatId: number, messageId: number | null, text: string, keyboard: InlineKeyboard): Promise<void> {
  if (messageId !== null) {
    try {
      await ctx.tg.call("editMessageText", { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", reply_markup: keyboard, link_preview_options: { is_disabled: true } });
      return;
    } catch (error) {
      // "message is not modified" means the screen is already right; anything else: send a fresh one.
      if (error instanceof TelegramError && error.message.includes("not modified")) return;
    }
  }
  await sendText(ctx, chatId, text, { keyboard });
}

export async function answerCallback(ctx: AppContext, callbackId: string, text?: string): Promise<void> {
  await ctx.tg.call("answerCallbackQuery", { callback_query_id: callbackId, ...(text ? { text } : {}) });
}

export async function markBlocked(ctx: AppContext, chatId: number): Promise<void> {
  await ctx.db.prepare("UPDATE bot_users SET is_blocked = 1, updated_at = ? WHERE telegram_id = ?").bind(ctx.nowIso, chatId).run();
}
