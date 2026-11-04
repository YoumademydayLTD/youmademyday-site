// Cancel one of a customer's memberships: at once during the free trial (no charge, per our terms), otherwise at
// the end of the paid period. Shared by the personal area and the bot.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { PolarApiError, polarConfig } from "../polar/client.ts";
import { cancelModeFor, cancelSubscription } from "../polar/subscriptions.ts";
import { findSubscriptionOf } from "../db/account.ts";
import { upsertSubscription } from "../db/subscriptions.ts";
import { subscriptionRow } from "../webhook/rows.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import type { Customer } from "../customers/repo.ts";
import { membershipView, type MembershipView } from "./present.ts";

export async function cancelMembership(env: Env, customer: Customer, subscriptionId: string, now: Date): Promise<MembershipView> {
  const current = await findSubscriptionOf(env.DB, customer.polarCustomerId, subscriptionId);
  if (!current) throw new HttpError("not_found", "no such membership");
  const view = membershipView(current);
  if (!view.canCancel) throw new HttpError("conflict", "this membership is already ending");
  let updated;
  try {
    updated = await cancelSubscription(polarConfig(env), subscriptionId, cancelModeFor(current.status));
  } catch (error) {
    if (!(error instanceof PolarApiError)) throw error;
    console.error("membership: Polar refused the cancel", subscriptionId, error.status, error.detail);
    throw new HttpError("payment_provider_error", "the membership could not be cancelled right now");
  }
  // Polar's reply is the new state; the webhook that follows writes the same row again.
  const row = subscriptionRow(updated, PRODUCT_MAP);
  await upsertSubscription(env.DB, row, now.toISOString());
  return membershipView({ ...current, status: row.status, cancelAtPeriodEnd: row.cancelAtPeriodEnd, currentPeriodEnd: row.currentPeriodEnd });
}
