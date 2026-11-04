// The team's answer to a customer, from /admin (text, optional photo) or from Telegram (a reply to a notice).
import type { AppContext } from "../app/context.ts";
import type { TgMessage } from "../telegram/types.ts";
import { escapeHtml } from "../i18n/index.ts";
import { sendText } from "../telegram/send.ts";
import { findUser } from "../users/repo.ts";
import { messageJson, threadJson } from "../admin/present.ts";
import { publish } from "../live/hub.ts";
import { addMessage, findThread, threadForNotice, type MessageRow, type ThreadRow } from "./repo.ts";
import { extractMedia } from "./media.ts";
import { preview } from "./routing.ts";
import { PREVIEW_LENGTH } from "./inbound.ts";

export interface Reply { text: string; photo: File | null }

async function record(ctx: AppContext, thread: ThreadRow, content: Parameters<typeof addMessage>[2], previewText: string): Promise<{ message: MessageRow; thread: ThreadRow }> {
  const saved = await addMessage(ctx.db, thread.id, content, previewText, ctx.nowIso);
  await publish(ctx.env, { type: "message", thread: threadJson(saved.thread, await findUser(ctx.db, thread.telegramId)), message: messageJson(saved.message) });
  return saved;
}

/** From the support center. */
export async function replyFromAdmin(ctx: AppContext, thread: ThreadRow, reply: Reply): Promise<{ message: MessageRow; thread: ThreadRow }> {
  if (reply.photo) {
    const form = new FormData();
    form.set("chat_id", String(thread.telegramId));
    form.set("photo", reply.photo, reply.photo.name || "photo.jpg");
    if (reply.text) form.set("caption", reply.text);
    const sent = await ctx.tg.upload<TgMessage>("sendPhoto", form);
    const fileId = sent.photo?.at(-1)?.file_id ?? null;
    return record(ctx, thread, { direction: "out", text: reply.text, mediaKind: "photo", fileId, fileName: null, telegramMessageId: sent.message_id }, preview(reply.text, "photo", PREVIEW_LENGTH));
  }
  const sent = await sendText(ctx, thread.telegramId, escapeHtml(reply.text));
  return record(ctx, thread, { direction: "out", text: reply.text, mediaKind: null, fileId: null, fileName: null, telegramMessageId: sent.message_id }, preview(reply.text, null, PREVIEW_LENGTH));
}

/** From Telegram: the admin replied to a support notice. Returns false when the notice is unknown. */
export async function replyFromTelegram(ctx: AppContext, adminChatId: number, noticeMessageId: number, message: TgMessage): Promise<boolean> {
  const threadId = await threadForNotice(ctx.db, adminChatId, noticeMessageId);
  const thread = threadId === null ? null : await findThread(ctx.db, threadId);
  if (!thread) return false;
  // copyMessage keeps text, photos and files exactly as the admin wrote them, without a «forwarded» header.
  const copy = await ctx.tg.call<{ message_id: number }>("copyMessage", { chat_id: thread.telegramId, from_chat_id: adminChatId, message_id: message.message_id });
  const content = extractMedia(message);
  await record(ctx, thread, { direction: "out", ...content, telegramMessageId: copy.message_id }, preview(content.text, content.mediaKind, PREVIEW_LENGTH));
  return true;
}
