// One Telegram update → the right feature. Only private chats are served.
import type { AppContext } from "../app/context.ts";
import type { TgMessage, TgUpdate } from "../telegram/types.ts";
import { upsertUser, type BotUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { sendText, markBlocked } from "../telegram/send.ts";
import { isAdmin } from "../admin/repo.ts";
import { routeMessage } from "../support/routing.ts";
import { handleSupportMessage } from "../support/inbound.ts";
import { replyFromTelegram } from "../support/outbound.ts";
import { handleCommand } from "./commands.ts";
import { handleCallback } from "./callbacks.ts";

const ADMIN_HINT = "כדי לענות ללקוח, השיבו (Reply) להודעה שלו כאן, או פתחו את מרכז התמיכה.";

async function handleMessage(ctx: AppContext, user: BotUser, message: TgMessage): Promise<void> {
  const text = message.text ?? "";
  const route = routeMessage({
    fromId: user.telegramId,
    isAdmin: await isAdmin(ctx.db, user.telegramId),
    isCommand: text.startsWith("/"),
    replyToMessageId: message.reply_to_message?.message_id ?? null,
  });
  switch (route.kind) {
    case "command": return handleCommand(ctx, user, text);
    case "support": return handleSupportMessage(ctx, user, message);
    case "admin-hint": return void (await sendText(ctx, user.telegramId, ADMIN_HINT));
    case "admin-reply": {
      const isSent = await replyFromTelegram(ctx, user.telegramId, route.noticeMessageId, message);
      if (isSent) await ctx.tg.call("setMessageReaction", { chat_id: user.telegramId, message_id: message.message_id, reaction: [{ type: "emoji", emoji: "👍" }] }).catch(() => undefined);
      else await sendText(ctx, user.telegramId, ADMIN_HINT);
    }
  }
}

export async function dispatch(ctx: AppContext, update: TgUpdate): Promise<void> {
  if (update.my_chat_member) {
    if (update.my_chat_member.chat.type === "private" && update.my_chat_member.new_chat_member.status === "kicked") await markBlocked(ctx, update.my_chat_member.chat.id);
    return;
  }
  const message = update.message;
  const query = update.callback_query;
  const from = message?.from ?? query?.from;
  const chatType = message?.chat.type ?? query?.message?.chat.type ?? "private";
  if (!from || from.is_bot || chatType !== "private") return;
  const user = await upsertUser(ctx.db, from, ctx.nowIso);
  try {
    if (message) await handleMessage(ctx, user, message);
    else if (query) await handleCallback(ctx, user, query);
  } catch (error) {
    console.error("bot: update failed", update.update_id, error instanceof Error ? error.stack ?? error.message : String(error));
    await sendText(ctx, user.telegramId, t(user.lang, "error")).catch(() => undefined);
  }
}
