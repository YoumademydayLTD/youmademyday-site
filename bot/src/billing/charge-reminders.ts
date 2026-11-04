// Cron: a reminder before every membership charge, with the amount and the date (terms: «before each charge,
// including the first one after the free day, the bot sends a reminder»). One per subscription and period.
import type { AppContext } from "../app/context.ts";
import { MS_PER_SECOND, SECONDS_PER_HOUR } from "../config/time.ts";
import { enqueue } from "../outbox/repo.ts";
import { ACTIVE_STATUSES } from "./subscriptions.ts";
import { planPriceMinor } from "./plan-price.ts";

// How long before the charge the reminder goes out. A weekly plan's free day is shorter than this,
// so its first reminder goes out as soon as the subscription appears.
export const REMIND_BEFORE_HOURS = 24;

interface DueCharge { telegram_id: number; subscription_id: string; plan_id: string | null; period_end: string; amount: number | null; currency: string | null }

export async function queueChargeReminders(ctx: AppContext): Promise<number> {
  const horizon = new Date(ctx.now.getTime() + REMIND_BEFORE_HOURS * SECONDS_PER_HOUR * MS_PER_SECOND).toISOString();
  const statuses = ACTIVE_STATUSES.map(() => "?").join(", ");
  const { results } = await ctx.db.prepare(
    `SELECT DISTINCT l.telegram_id, s.id AS subscription_id, s.plan_id, s.current_period_end AS period_end,
       (SELECT o2.total_amount FROM orders o2 WHERE o2.subscription_id = s.id ORDER BY o2.created_at DESC LIMIT 1) AS amount,
       (SELECT o3.currency FROM orders o3 WHERE o3.subscription_id = s.id ORDER BY o3.created_at DESC LIMIT 1) AS currency
     FROM subscriptions s
     JOIN orders o ON o.customer_id = s.customer_id
     JOIN bot_order_links l ON l.checkout_id = o.checkout_id
     WHERE s.status IN (${statuses}) AND s.cancel_at_period_end = 0
       AND s.current_period_end > ? AND s.current_period_end <= ?`,
  ).bind(...ACTIVE_STATUSES, ctx.nowIso, horizon).all<DueCharge>();
  let queued = 0;
  for (const row of results) {
    const amount = row.amount ? row.amount : row.plan_id && row.currency ? planPriceMinor(row.plan_id, row.currency) : null;
    if (!row.plan_id || !amount || !row.currency) {
      console.error("billing: cannot remind, missing plan or amount", row.subscription_id);
      continue;
    }
    const payload = { kind: "charge" as const, planId: row.plan_id, periodEnd: row.period_end, amount, currency: row.currency };
    const isNew = await enqueue(ctx.db, { telegramId: row.telegram_id, payload, sendAfter: ctx.nowSeconds, dedupeKey: `charge:${row.subscription_id}:${row.period_end}` }, ctx.nowIso);
    if (isNew) queued += 1;
  }
  return queued;
}
