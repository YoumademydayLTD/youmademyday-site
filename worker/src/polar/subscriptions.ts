// Ending a membership on Polar. Per our terms a cancel during the free trial ends it at once, so no charge
// ever happens; a paid period runs to its end and never renews.
import { polarRequest, type PolarConfig } from "./client.ts";
import type { Json } from "../webhook/read.ts";

export const TRIAL_STATUS = "trialing";

export type CancelMode = "now" | "period_end";
export const cancelModeFor = (status: string): CancelMode => (status === TRIAL_STATUS ? "now" : "period_end");

export async function cancelSubscription(config: PolarConfig, subscriptionId: string, mode: CancelMode): Promise<Json> {
  const path = `/subscriptions/${encodeURIComponent(subscriptionId)}`;
  return mode === "now"
    ? polarRequest<Json>(config, "DELETE", path)
    : polarRequest<Json>(config, "PATCH", path, { cancel_at_period_end: true });
}
