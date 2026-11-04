// Apply an order.* event: entitlements first (so a paid order is never visible without its files), then the order row.
import { CATALOG } from "../catalog/index.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { findCheckoutItems } from "../db/checkouts.ts";
import { upsertOrder } from "../db/orders.ts";
import { grantEntitlements, revokeEntitlements } from "../db/entitlements.ts";
import { deliverableIds } from "../delivery/items.ts";
import { orderRow, withCheckoutItems } from "./rows.ts";
import type { Json } from "./read.ts";
import type { Env } from "../env.ts";
import { notifyBotOrderPaid } from "../internal/bot.ts";

/** The Telegram user who bought through this checkout (buyers are signed in), if known. */
async function buyerTelegramId(db: D1Database, checkoutId: string): Promise<number | null> {
  const row = await db.prepare("SELECT cu.telegram_id FROM checkouts c JOIN customers cu ON cu.ym = c.customer_ym WHERE c.id = ?").bind(checkoutId).first<{ telegram_id: number }>();
  return row?.telegram_id ?? null;
}

export async function applyOrder(env: Env, data: Json, now: string): Promise<void> {
  const db = env.DB;
  const parsed = orderRow(data, PRODUCT_MAP);
  const checkout = parsed.checkoutId ? await findCheckoutItems(db, parsed.checkoutId) : null;
  const order = withCheckoutItems(parsed, checkout);
  if (order.status === "paid") {
    await grantEntitlements(db, {
      orderId: order.id, checkoutId: order.checkoutId, customerId: order.customerId, customerEmail: order.customerEmail,
      lang: order.lang ?? checkout?.lang ?? CATALOG.defaultLang, productIds: deliverableIds(order.itemIds, CATALOG),
    }, now);
  } else if (order.status === "refunded") {
    await revokeEntitlements(db, order.id, now);
  }
  await upsertOrder(db, order, now);
  if (order.status !== "paid" || !order.checkoutId) return;
  const telegramId = await buyerTelegramId(db, order.checkoutId);
  if (telegramId === null) return;
  // A failed call is logged only: the buyer still has the thanks page, the personal area and the bot button.
  await notifyBotOrderPaid(env, order.checkoutId, telegramId).catch((error: unknown) =>
    console.error("order: bot delivery not triggered", order.checkoutId, error instanceof Error ? error.message : String(error)));
}
