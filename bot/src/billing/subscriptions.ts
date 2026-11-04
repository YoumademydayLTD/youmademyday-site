// Memberships of a Telegram user, read-only from the store's subscriptions, customers and orders tables. A subscription
// belongs to the user when its Polar customer is theirs (store customers table, buyers sign in with Telegram), or when
// one of its orders (same customer) was linked to them in the bot.
export interface UserSubscription { id: string; planId: string | null; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }

// Statuses in which a membership gives access (Polar's subscription statuses).
export const ACTIVE_STATUSES = ["active", "trialing"] as const;

const USER_CUSTOMERS = `SELECT o.customer_id FROM orders o JOIN bot_order_links l ON l.checkout_id = o.checkout_id
  WHERE l.telegram_id = ?1 AND o.customer_id IS NOT NULL
  UNION SELECT polar_customer_id FROM customers WHERE telegram_id = ?1 AND polar_customer_id IS NOT NULL`;

export async function listUserSubscriptions(db: D1Database, telegramId: number): Promise<UserSubscription[]> {
  const { results } = await db.prepare(`SELECT id, plan_id, status, current_period_end, cancel_at_period_end FROM subscriptions
    WHERE customer_id IN (${USER_CUSTOMERS}) ORDER BY updated_at DESC`).bind(telegramId)
    .all<{ id: string; plan_id: string | null; status: string; current_period_end: string | null; cancel_at_period_end: number }>();
  return results.map((r) => ({ id: r.id, planId: r.plan_id, status: r.status, currentPeriodEnd: r.current_period_end, cancelAtPeriodEnd: r.cancel_at_period_end === 1 }));
}

export const isActive = (s: UserSubscription): boolean => (ACTIVE_STATUSES as readonly string[]).includes(s.status);

export async function activePlanIds(db: D1Database, telegramId: number): Promise<string[]> {
  return (await listUserSubscriptions(db, telegramId)).filter(isActive).flatMap((s) => (s.planId ? [s.planId] : []));
}
