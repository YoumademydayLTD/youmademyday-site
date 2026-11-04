// What a signed-in customer may read and download: what they bought, plus what their running memberships include.
import type { Env } from "../env.ts";
import { CATALOG } from "../catalog/index.ts";
import { listOwnedProducts, listSubscriptions } from "../db/account.ts";
import type { Customer } from "../customers/repo.ts";
import { includedProducts, RUNNING_STATUSES } from "./plan-library.ts";

export interface Access { owned: string[]; viaPlan: Set<string> }

export async function accessOf(env: Env, customer: Customer): Promise<Access> {
  const [owned, subscriptions] = await Promise.all([
    listOwnedProducts(env.DB, { ym: customer.ym, polarCustomerId: customer.polarCustomerId }),
    listSubscriptions(env.DB, customer.polarCustomerId),
  ]);
  const planIds = subscriptions.filter((s) => RUNNING_STATUSES.has(s.status) && s.planId).map((s) => s.planId ?? "");
  const ownedSet = new Set(owned);
  const viaPlan = new Set([...includedProducts(planIds, CATALOG)].filter((id) => !ownedSet.has(id)));
  return { owned, viaPlan };
}

export const canRead = (access: Access, productId: string): boolean => access.owned.includes(productId) || access.viaPlan.has(productId);
