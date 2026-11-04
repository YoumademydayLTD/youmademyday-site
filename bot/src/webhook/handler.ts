// POST /telegram/webhook: checks Telegram's secret header, handles each update once (dedupe on update_id),
// answers 200 at once and does the work after the reply.
import type { AppContext } from "../app/context.ts";
import { HttpError } from "../http/errors.ts";
import { readText } from "../http/response.ts";
import type { TgUpdate } from "../telegram/types.ts";
import { dispatch } from "../bot/dispatch.ts";
import { isWebhookAuthentic } from "./secret.ts";

// Telegram's updates are small; a file is never inlined, only referenced by id.
const MAX_UPDATE_BYTES = 256 * 1024;

export async function handleWebhook(request: Request, ctx: AppContext): Promise<Response> {
  if (!isWebhookAuthentic(request.headers, ctx.env.TELEGRAM_WEBHOOK_SECRET)) throw new HttpError("unauthorized", "bad webhook secret");
  let update: TgUpdate;
  try {
    update = JSON.parse(await readText(request, MAX_UPDATE_BYTES)) as TgUpdate;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError("bad_request", "the update is not JSON");
  }
  if (!Number.isInteger(update.update_id)) throw new HttpError("bad_request", "update_id missing");
  const inserted = await ctx.db.prepare("INSERT OR IGNORE INTO bot_updates (update_id, received_at) VALUES (?, ?)").bind(update.update_id, ctx.nowIso).run();
  if (inserted.meta.changes === 1) ctx.waitUntil(dispatch(ctx, update));
  return new Response("ok");
}

/** Housekeeping: Telegram never resends an update after a day. */
export async function purgeUpdates(db: D1Database, before: string): Promise<void> {
  await db.prepare("DELETE FROM bot_updates WHERE received_at < ?").bind(before).run();
}
