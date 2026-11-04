// Turn Polar webhook objects into our table rows (pure).
import { STORE_ORDER_ID, PLAN_ID_PREFIX, storeIdOf, type ProductMap } from "../polar/mapping.ts";
import type { CheckoutRow } from "../db/checkouts.ts";
import type { OrderRow } from "../db/orders.ts";
import type { SubscriptionRow } from "../db/subscriptions.ts";
import { metadataOf, num, obj, str, type Json } from "./read.ts";

const splitIds = (value: string | undefined): string[] => (value ? value.split(",").filter(Boolean) : []);

export function checkoutRow(data: Json, map: ProductMap): CheckoutRow {
  const metadata = metadataOf(data);
  const productId = str(data, "product_id") ?? "";
  return {
    id: str(data, "id") ?? "",
    source: "polar",
    kind: metadata.ymd_kind ?? "polar",
    itemIds: splitIds(metadata.ymd_ids ?? storeIdOf(map, productId)),
    lang: metadata.ymd_lang ?? null,
    currency: str(data, "currency") ?? "",
    amount: num(data, "total_amount"),
    polarProductId: productId,
    status: str(data, "status") ?? "unknown",
    metadata,
  };
}

export function orderRow(data: Json, map: ProductMap): OrderRow {
  const metadata = metadataOf(data);
  const productId = str(data, "product_id");
  const storeId = productId ? storeIdOf(map, productId) : undefined;
  const itemIds = splitIds(metadata.ymd_ids ?? storeId);
  return {
    id: str(data, "id") ?? "",
    checkoutId: str(data, "checkout_id"),
    customerId: str(data, "customer_id"),
    customerEmail: str(obj(data, "customer"), "email"),
    productId,
    subscriptionId: str(data, "subscription_id"),
    status: str(data, "status") ?? "unknown",
    billingReason: str(data, "billing_reason"),
    currency: str(data, "currency") ?? "",
    totalAmount: num(data, "total_amount"),
    refundedAmount: num(data, "refunded_amount"),
    itemIds,
    lang: metadata.ymd_lang ?? null,
    // A store order bought without our item list (e.g. straight from Polar) cannot be delivered automatically.
    needsReview: storeId === STORE_ORDER_ID && !metadata.ymd_ids,
    metadata,
  };
}

export function subscriptionRow(data: Json, map: ProductMap): SubscriptionRow {
  const productId = str(data, "product_id");
  const storeId = productId ? storeIdOf(map, productId) : undefined;
  return {
    id: str(data, "id") ?? "",
    customerId: str(data, "customer_id"),
    customerEmail: str(obj(data, "customer"), "email"),
    productId,
    planId: storeId?.startsWith(PLAN_ID_PREFIX) ? storeId.slice(PLAN_ID_PREFIX.length) : null,
    status: str(data, "status") ?? "unknown",
    currentPeriodEnd: str(data, "current_period_end"),
    cancelAtPeriodEnd: data.cancel_at_period_end === true,
    canceledAt: str(data, "canceled_at"),
    endedAt: str(data, "ended_at"),
    metadata: metadataOf(data),
  };
}
