// The status CRX reads for one of its links (pure): what Polar's checkout, order and subscription add up to.
import { storeIdOf, type ProductMap } from "../polar/mapping.ts";

export type LinkState = "pending" | "paid" | "refunded" | "trialing" | "active" | "canceled";

export interface LinkCheckoutFacts {
  id: string; itemIds: string[]; currency: string; amount: number; polarProductId: string; status: string; telegramId: number | null;
}
export interface LinkOrderFacts { status: string }
export interface LinkSubscriptionFacts { id: string; status: string; cancelAtPeriodEnd: boolean; currentPeriodEnd: string | null }
export interface LinkFacts { checkout: LinkCheckoutFacts; order: LinkOrderFacts | null; subscription: LinkSubscriptionFacts | null }

export interface LinkStatus {
  id: string;
  status: LinkState;
  product: string;
  amount: number; // currency units, as POST /api/links takes it (100 = 100 GEL)
  currency: string;
  telegram_user_id: number | null;
  checkout_status: string; // Polar's own, e.g. open | confirmed | succeeded | expired | failed
  subscription?: { id: string; status: string; cancel_at_period_end: boolean; current_period_end: string | null };
}

const MINOR_UNITS = 100;
const REFUNDED_ORDERS = new Set(["refunded", "partially_refunded"]);
// Polar's subscription statuses (SubscriptionStatus). past_due still runs while Polar retries the card;
// paused, unpaid and incomplete_expired give no access, so CRX sees them as ended.
const SUBSCRIPTION_STATE: Record<string, LinkState> = {
  trialing: "trialing",
  active: "active",
  past_due: "active",
  incomplete: "pending",
  canceled: "canceled",
  unpaid: "canceled",
  incomplete_expired: "canceled",
  paused: "canceled",
};

/** Refund first (money went back), then the membership's own state, then a paid order; anything else is pending. */
export function linkStateOf(facts: Pick<LinkFacts, "order" | "subscription">): LinkState {
  if (facts.order && REFUNDED_ORDERS.has(facts.order.status)) return "refunded";
  if (facts.subscription) return SUBSCRIPTION_STATE[facts.subscription.status] ?? "pending";
  return facts.order?.status === "paid" ? "paid" : "pending";
}

export function linkStatus(facts: LinkFacts, map: ProductMap): LinkStatus {
  const { checkout, subscription } = facts;
  return {
    id: checkout.id,
    status: linkStateOf(facts),
    product: storeIdOf(map, checkout.polarProductId) ?? checkout.itemIds[0] ?? "",
    amount: checkout.amount / MINOR_UNITS,
    currency: checkout.currency,
    telegram_user_id: checkout.telegramId,
    checkout_status: checkout.status,
    ...(subscription ? { subscription: {
      id: subscription.id, status: subscription.status, cancel_at_period_end: subscription.cancelAtPeriodEnd, current_period_end: subscription.currentPeriodEnd,
    } } : {}),
  };
}
