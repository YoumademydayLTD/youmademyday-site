// A plan's renewal price from the store's generated catalogue (data only, bundled at deploy: redeploy the bot
// after a price change). Used when the last order of a subscription was the free trial (amount 0).
import catalog from "../../../worker/src/catalog/catalog.json";
import { MINOR_PER_UNIT } from "../config/money.ts";

// prices: the plan's price in each currency other than shekels (tools/currency_prices.json, owner 12.11.2026).
interface PlanPrice { price: number; usd?: number; prices?: Record<string, number> }
const HOME_CURRENCY = "ils";
const PLANS = catalog.plans as Record<string, PlanPrice>;

/** The renewal amount in minor units, or null when the plan or currency is unknown. */
export function planPriceMinor(planId: string, currency: string): number | null {
  const plan = PLANS[planId];
  if (!plan) return null;
  const code = currency.toLowerCase();
  const units = code === HOME_CURRENCY ? plan.price : plan.prices?.[code] ?? (code === "usd" ? plan.usd : undefined);
  return units === undefined ? null : units * MINOR_PER_UNIT;
}
