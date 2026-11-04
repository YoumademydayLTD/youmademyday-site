// A plan's renewal price from the store's generated catalogue (data only, bundled at deploy: redeploy the bot
// after a price change). Used when the last order of a subscription was the free trial (amount 0).
import catalog from "../../../worker/src/catalog/catalog.json";
import { MINOR_PER_UNIT } from "../config/money.ts";

interface PlanPrice { price: number; usd?: number }
const PLANS = catalog.plans as Record<string, PlanPrice>;

/** The renewal amount in minor units, or null when the plan or currency is unknown. */
export function planPriceMinor(planId: string, currency: string): number | null {
  const plan = PLANS[planId];
  if (!plan) return null;
  const units = currency.toLowerCase() === "usd" ? plan.usd : currency.toLowerCase() === "ils" ? plan.price : undefined;
  return units === undefined ? null : units * MINOR_PER_UNIT;
}
