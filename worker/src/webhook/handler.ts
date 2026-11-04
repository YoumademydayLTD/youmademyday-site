// POST /api/polar/webhook: verify, store once, answer at once; the tables are updated after the reply.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { readText } from "../http/response.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { recordEvent, markProcessed } from "../db/events.ts";
import { upsertCheckoutStatus } from "../db/checkouts.ts";
import { upsertSubscription } from "../db/subscriptions.ts";
import { verifyWebhook } from "./verify.ts";
import { isObject, str, type Json } from "./read.ts";
import { checkoutRow, subscriptionRow } from "./rows.ts";
import { applyOrder } from "./order.ts";

const MAX_WEBHOOK_BYTES = 1024 * 1024;
const MS_PER_SECOND = 1000;

/** Which table an event type updates, by its prefix. */
async function project(db: D1Database, type: string, data: Json, now: string): Promise<void> {
  if (type.startsWith("checkout.")) await upsertCheckoutStatus(db, checkoutRow(data, PRODUCT_MAP), now);
  else if (type.startsWith("order.")) await applyOrder(db, data, now);
  else if (type.startsWith("subscription.")) await upsertSubscription(db, subscriptionRow(data, PRODUCT_MAP), now);
}

async function projectAndMark(db: D1Database, id: string, type: string, data: Json): Promise<void> {
  try {
    await project(db, type, data, new Date().toISOString());
    await markProcessed(db, id, new Date().toISOString(), null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("webhook: could not apply", id, type, message);
    await markProcessed(db, id, new Date().toISOString(), message);
  }
}

export async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext, now: Date): Promise<{ received: boolean; duplicate: boolean }> {
  const body = await readText(request, MAX_WEBHOOK_BYTES);
  const headers = { id: request.headers.get("webhook-id"), timestamp: request.headers.get("webhook-timestamp"), signature: request.headers.get("webhook-signature") };
  const verified = await verifyWebhook(headers, body, env.POLAR_WEBHOOK_SECRET, Math.floor(now.getTime() / MS_PER_SECOND));
  if (!verified.ok) {
    console.warn("webhook: rejected", verified.reason);
    throw new HttpError("unauthorized", `webhook rejected: ${verified.reason}`);
  }
  let event: unknown;
  try { event = JSON.parse(body); } catch { throw new HttpError("bad_request", "webhook body is not JSON"); }
  if (!isObject(event) || !isObject(event.data)) throw new HttpError("bad_request", "webhook body has no data object");
  const id = headers.id ?? "";
  const type = str(event, "type") ?? "unknown";
  const isNew = await recordEvent(env.DB, { id, type, payload: body }, now.toISOString());
  if (isNew) ctx.waitUntil(projectAndMark(env.DB, id, type, event.data));
  return { received: true, duplicate: !isNew };
}
