// "/start order-<checkout id>" from the thanks page: link the order to this Telegram user and send its files.
// While the payment is pending, the cron delivers it later (deliverPending).
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { sendText } from "../telegram/send.ts";
import { mainMenu } from "../menu/keyboards.ts";
import { fetchDownloads } from "./store.ts";
import { linkOrder, listUndelivered, markDelivered, type OrderLink } from "./links.ts";
import { sendFiles } from "./send-files.ts";
import { findUser } from "../users/repo.ts";
import { findStoreOrder } from "./store.ts";
import { MS_PER_SECOND, SECONDS_PER_DAY } from "../config/time.ts";

// Pending orders the cron re-checks per run, and for how long after linking (an unpaid checkout is dropped after that).
const PENDING_BATCH = 20;
const PENDING_DAYS = 3;

type DeliveryResult = "sent" | "pending" | "refunded";

async function deliver(ctx: AppContext, user: BotUser, checkoutId: string): Promise<DeliveryResult> {
  const downloads = await fetchDownloads(ctx, checkoutId);
  if (downloads.status !== "ready") return downloads.status;
  await sendText(ctx, user.telegramId, t(user.lang, "orderThanks"));
  await sendFiles(ctx, user.telegramId, user.lang, downloads.items);
  const order = await findStoreOrder(ctx.db, checkoutId);
  await markDelivered(ctx.db, checkoutId, order?.id ?? "", ctx.nowIso);
  return "sent";
}

export async function handleOrderStart(ctx: AppContext, user: BotUser, checkoutId: string): Promise<void> {
  const outcome = await linkOrder(ctx.db, checkoutId, user.telegramId, ctx.nowIso);
  if (outcome === "other-user") {
    await sendText(ctx, user.telegramId, t(user.lang, "orderOtherUser"));
    return;
  }
  const result = await deliver(ctx, user, checkoutId);
  if (result === "pending") {
    const known = await ctx.db.prepare("SELECT 1 AS x FROM checkouts WHERE id = ?").bind(checkoutId).first();
    await sendText(ctx, user.telegramId, t(user.lang, known ? "orderPending" : "orderNotFound"));
  } else if (result === "refunded") {
    await sendText(ctx, user.telegramId, t(user.lang, "orderRefunded"));
  }
  if (result === "sent") await sendText(ctx, user.telegramId, t(user.lang, "menuPrompt"), { keyboard: mainMenu(user.lang, ctx.env.SITE_URL) });
}

/** Cron: orders linked while their payment was pending get their files once it is paid. */
export async function deliverPending(ctx: AppContext): Promise<void> {
  const since = new Date(ctx.now.getTime() - PENDING_DAYS * SECONDS_PER_DAY * MS_PER_SECOND).toISOString();
  const pending: OrderLink[] = await listUndelivered(ctx.db, since, PENDING_BATCH);
  for (const linkRow of pending) {
    const user = await findUser(ctx.db, linkRow.telegramId);
    if (!user || user.isBlocked) continue;
    try {
      const result = await deliver(ctx, user, linkRow.checkoutId);
      if (result === "refunded") await markDelivered(ctx.db, linkRow.checkoutId, "", ctx.nowIso);
    } catch (error) {
      console.error("library: pending delivery failed", linkRow.checkoutId, error instanceof Error ? error.message : String(error));
    }
  }
}
