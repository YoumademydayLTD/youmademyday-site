// A customer's message to the team: stored in their thread, acknowledged once per thread, pushed live to /admin,
// and announced to the admin in Telegram with a button to the thread (a reply to that notice answers the customer).
import type { AppContext } from "../app/context.ts";
import type { TgMessage } from "../telegram/types.ts";
import type { BotUser } from "../users/repo.ts";
import { displayName } from "../users/repo.ts";
import { escapeHtml, t } from "../i18n/index.ts";
import { sendText } from "../telegram/send.ts";
import { link } from "../menu/keyboards.ts";
import { listAdminIds } from "../admin/repo.ts";
import { messageJson, threadJson } from "../admin/present.ts";
import { publish } from "../live/hub.ts";
import { addMessage, markAcked, openThreadFor, saveNotice, type ThreadRow } from "./repo.ts";
import { extractMedia, type Extracted } from "./media.ts";
import { needsAck, preview } from "./routing.ts";

export const PREVIEW_LENGTH = 120;
const NOTICE_LENGTH = 1500;

export const threadUrl = (publicUrl: string, threadId: number): string => `${publicUrl}/admin/#thread-${threadId}`;

function noticeText(user: BotUser, thread: ThreadRow, content: Extracted): string {
  const who = [escapeHtml(displayName(user)), user.username ? `@${escapeHtml(user.username)}` : "", user.lang].filter(Boolean).join(" · ");
  return `💬 <b>${who}</b> · #${thread.id}\n\n${escapeHtml(preview(content.text, content.mediaKind, NOTICE_LENGTH))}\n\n<i>השיבו להודעה הזו כדי לענות.</i>`;
}

async function notifyAdmins(ctx: AppContext, user: BotUser, thread: ThreadRow, message: TgMessage, content: Extracted): Promise<void> {
  for (const adminId of await listAdminIds(ctx.db)) {
    try {
      const notice = await sendText(ctx, adminId, noticeText(user, thread, content), { keyboard: { inline_keyboard: [[link("לפתוח בתמיכה", threadUrl(ctx.env.PUBLIC_URL, thread.id))]] } });
      await saveNotice(ctx.db, adminId, notice.message_id, thread.id);
      if (content.mediaKind) {
        // The photo or file itself, as a reply to the notice; replying to it also reaches the customer.
        const copy = await ctx.tg.call<{ message_id: number }>("copyMessage", { chat_id: adminId, from_chat_id: user.telegramId, message_id: message.message_id, reply_parameters: { message_id: notice.message_id } });
        await saveNotice(ctx.db, adminId, copy.message_id, thread.id);
      }
    } catch (error) {
      console.error("support: admin notice failed", adminId, error instanceof Error ? error.message : String(error));
    }
  }
}

export async function handleSupportMessage(ctx: AppContext, user: BotUser, message: TgMessage): Promise<void> {
  const content = extractMedia(message);
  const thread = await openThreadFor(ctx.db, user.telegramId, ctx.nowIso);
  const saved = await addMessage(ctx.db, thread.id, { direction: "in", ...content, telegramMessageId: message.message_id }, preview(content.text, content.mediaKind, PREVIEW_LENGTH), ctx.nowIso);
  if (needsAck(thread)) {
    await markAcked(ctx.db, thread.id);
    await sendText(ctx, user.telegramId, t(user.lang, "supportAck"));
  }
  await publish(ctx.env, { type: "message", thread: threadJson(saved.thread, user), message: messageJson(saved.message) });
  await notifyAdmins(ctx, user, saved.thread, message, content);
}
