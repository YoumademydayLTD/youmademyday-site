// POST /api/internal/orders/paid {checkoutId, telegramId}: the store worker reports a paid order of a signed-in
// buyer, so the order is linked to them and its files are sent to their chat right away (answered at once).
import type { AppContext } from "../app/context.ts";
import { HttpError } from "../http/errors.ts";
import { findUser } from "../users/repo.ts";
import { linkOrder } from "../library/links.ts";
import { deliver } from "../library/order.ts";
import { assertInternal } from "./auth.ts";

const CHECKOUT_ID = /^[0-9a-f-]{36}$/i;

export function parsePaidOrder(body: unknown): { checkoutId: string; telegramId: number } {
  const { checkoutId, telegramId } = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (typeof checkoutId !== "string" || !CHECKOUT_ID.test(checkoutId)) throw new HttpError("bad_request", "checkoutId must be a checkout id");
  if (typeof telegramId !== "number" || !Number.isSafeInteger(telegramId)) throw new HttpError("bad_request", "telegramId must be an integer");
  return { checkoutId, telegramId };
}

export async function postOrderPaid(request: Request, ctx: AppContext): Promise<unknown> {
  assertInternal(request, ctx.env.YMD_INTERNAL_SECRET);
  const { checkoutId, telegramId } = parsePaidOrder(await request.json().catch(() => null));
  const user = await findUser(ctx.db, telegramId);
  if (!user || user.isBlocked) return { linked: false };
  const outcome = await linkOrder(ctx.db, checkoutId, telegramId, ctx.nowIso);
  if (outcome === "other-user") return { linked: false };
  ctx.waitUntil(deliver(ctx, user, checkoutId).catch((error: unknown) =>
    console.error("internal: paid order delivery failed (the cron retries)", checkoutId, error instanceof Error ? error.message : String(error))));
  return { linked: true };
}
