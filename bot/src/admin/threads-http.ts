// Support-center endpoints for threads, replies, user cards, quick replies and the media proxy.
import type { AppContext } from "../app/context.ts";
import { findYm } from "./customers.ts";
import { HttpError } from "../http/errors.ts";
import { TelegramError } from "../telegram/api.ts";
import { readJsonObject, requireString } from "../http/response.ts";
import { findUser } from "../users/repo.ts";
import { findFile, findThread, listMessages, listThreads, markRead, setStatus, type ThreadStatus } from "../support/repo.ts";
import { replyFromAdmin } from "../support/outbound.ts";
import { publish } from "../live/hub.ts";
import { listUserSubscriptions } from "../billing/subscriptions.ts";
import { listPurchases } from "./purchases.ts";
import { messageJson, threadJson, userCard } from "./present.ts";
import { attachment, mediaType } from "./media-type.ts";

const INBOX_LIMIT = 200;
const MAX_REPLY_LENGTH = 4000; // Telegram's text limit is 4096; a caption is 1024 (checked below)
const MAX_CAPTION_LENGTH = 1024;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // Telegram's sendPhoto limit

async function threadOr404(ctx: AppContext, id: number) {
  const thread = await findThread(ctx.db, id);
  if (!thread) throw new HttpError("not_found", "no such thread");
  return thread;
}

export async function getThreads(request: Request, ctx: AppContext): Promise<unknown> {
  const status = new URL(request.url).searchParams.get("status") ?? "open";
  if (!["open", "resolved", "all"].includes(status)) throw new HttpError("bad_request", "status must be open, resolved or all");
  const threads = await listThreads(ctx.db, status as ThreadStatus | "all", INBOX_LIMIT);
  return { threads: await Promise.all(threads.map(async (th) => threadJson(th, await findUser(ctx.db, th.telegramId)))) };
}

export async function getThread(ctx: AppContext, id: number): Promise<unknown> {
  await threadOr404(ctx, id);
  const thread = await markRead(ctx.db, id);
  if (!thread) throw new HttpError("not_found", "no such thread");
  const json = threadJson(thread, await findUser(ctx.db, thread.telegramId));
  await publish(ctx.env, { type: "thread", thread: json });
  return { thread: json, messages: (await listMessages(ctx.db, id)).map(messageJson) };
}

async function readReply(request: Request): Promise<{ text: string; photo: File | null }> {
  if ((request.headers.get("Content-Type") ?? "").startsWith("multipart/form-data")) {
    const form = await request.formData();
    const text = String(form.get("text") ?? "").trim();
    const photo = form.get("photo");
    const file = photo instanceof File && photo.size > 0 ? photo : null;
    if (file && (file.size > MAX_PHOTO_BYTES || !file.type.startsWith("image/"))) throw new HttpError("bad_request", "the photo must be an image up to 10 MB");
    if (file && text.length > MAX_CAPTION_LENGTH) throw new HttpError("bad_request", `a photo caption is at most ${MAX_CAPTION_LENGTH} characters`);
    if (!file && !text) throw new HttpError("bad_request", "write a reply or attach a photo");
    return { text, photo: file };
  }
  return { text: requireString(await readJsonObject(request), "text", MAX_REPLY_LENGTH), photo: null };
}

export async function postReply(request: Request, ctx: AppContext, id: number): Promise<unknown> {
  const thread = await threadOr404(ctx, id);
  const reply = await readReply(request);
  let saved;
  try {
    saved = await replyFromAdmin(ctx, thread, reply);
  } catch (error) {
    if (!(error instanceof TelegramError)) throw error;
    console.error("support: reply failed", id, error.message);
    throw new HttpError("upstream_error", error.isBlocked ? "the customer blocked the bot, so the reply was not delivered" : "Telegram did not accept the reply; try again in a moment");
  }
  return { message: messageJson(saved.message), thread: threadJson(saved.thread, await findUser(ctx.db, thread.telegramId)) };
}

export async function postStatus(request: Request, ctx: AppContext, id: number): Promise<unknown> {
  await threadOr404(ctx, id);
  const status = (await readJsonObject(request)).status;
  if (status !== "open" && status !== "resolved") throw new HttpError("bad_request", "status must be open or resolved");
  const thread = await setStatus(ctx.db, id, status);
  if (!thread) throw new HttpError("not_found", "no such thread");
  const json = threadJson(thread, await findUser(ctx.db, thread.telegramId));
  await publish(ctx.env, { type: "thread", thread: json });
  return { thread: json };
}

export async function getUserCard(ctx: AppContext, telegramId: number): Promise<unknown> {
  const user = await findUser(ctx.db, telegramId);
  if (!user) throw new HttpError("not_found", "no such user");
  const subscriptions = await listUserSubscriptions(ctx.db, telegramId);
  return { user: { ...userCard(user), ym: await findYm(ctx.db, telegramId) }, purchases: await listPurchases(ctx.db, telegramId), subscriptions };
}

/** GET /admin/file/:fileId — a customer's photo or file, streamed from Telegram so the bot token stays here. */
export async function getMedia(ctx: AppContext, fileId: string): Promise<Response> {
  const file = await findFile(ctx.db, fileId);
  if (!file) throw new HttpError("not_found", "no such file");
  const upstream = await ctx.tg.download(fileId);
  if (!upstream.ok || !upstream.body) throw new HttpError("upstream_error", "Telegram did not return the file");
  // Telegram's file server answers application/octet-stream, so the type comes from what the message was.
  const headers: Record<string, string> = { "Content-Type": mediaType(file), "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" };
  if (file.mediaKind === "document") headers["Content-Disposition"] = attachment(file.fileName ?? "file");
  return new Response(upstream.body, { headers });
}

export async function postRead(ctx: AppContext, id: number): Promise<unknown> {
  const thread = await markRead(ctx.db, id);
  if (!thread) throw new HttpError("not_found", "no such thread");
  const json = threadJson(thread, await findUser(ctx.db, thread.telegramId));
  await publish(ctx.env, { type: "thread", thread: json });
  return { thread: json };
}
