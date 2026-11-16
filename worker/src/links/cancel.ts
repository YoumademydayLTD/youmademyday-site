// POST /api/links/:id/cancel: server to server, the same bearer secret as POST /api/links (added 15.11.2026).
// A link caller ends the membership one of its links started, from its own personal area. The rule is the store's
// own (account/membership.ts): during the free trial it ends at once and nothing is charged; a paid period runs to
// its end and never renews. The reply is the link's status after it, as GET /api/links/:id/status gives it.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { findCustomerByTelegram } from "../customers/repo.ts";
import { cancelMembership } from "../account/membership.ts";
import { assertAuthorized } from "./auth.ts";
import { readLinkStatus, type LinkStatus } from "./status.ts";

export async function handleLinkCancel(request: Request, env: Env, checkoutId: string, now: Date): Promise<LinkStatus> {
  assertAuthorized(request.headers.get("Authorization"), env.YMD_LINKS_SECRET);
  const before = await readLinkStatus(env.DB, checkoutId, PRODUCT_MAP);
  if (!before) throw new HttpError("not_found", `no CRX link ${checkoutId}`);
  if (!before.subscription) throw new HttpError("conflict", "this link started no membership");
  if (before.telegram_user_id === null) throw new HttpError("not_found", "the link has no buyer");
  const customer = await findCustomerByTelegram(env.DB, before.telegram_user_id);
  if (!customer) throw new HttpError("not_found", "no such customer");
  await cancelMembership(env, customer, before.subscription.id, now);
  const after = await readLinkStatus(env.DB, checkoutId, PRODUCT_MAP);
  if (!after) throw new HttpError("not_found", `no CRX link ${checkoutId}`);
  return after;
}
