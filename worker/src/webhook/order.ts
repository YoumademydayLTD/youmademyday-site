// Apply an order.* event: entitlements first (so a paid order is never visible without its files), then the order row.
import { CATALOG } from "../catalog/index.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { findCheckoutItems } from "../db/checkouts.ts";
import { upsertOrder } from "../db/orders.ts";
import { grantEntitlements, revokeEntitlements } from "../db/entitlements.ts";
import { deliverableIds } from "../delivery/items.ts";
import { orderRow, withCheckoutItems } from "./rows.ts";
import type { Json } from "./read.ts";

export async function applyOrder(db: D1Database, data: Json, now: string): Promise<void> {
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
}
