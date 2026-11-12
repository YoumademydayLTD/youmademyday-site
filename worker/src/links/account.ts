// POST /api/links/accounts {telegram_user_id}: server to server, the same bearer secret as POST /api/links.
// Owner, 12.11.2026: a link caller opens the store account of one of its users before any sale (when he signs up
// there), so the account exists by the time he buys. Silent: nothing is sent to him, and no customer is created at the
// payment provider (that happens on his first payment link, see customers/buyer.ts). Calling it again changes nothing.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject } from "../http/response.ts";
import { ensureCustomer } from "../customers/repo.ts";
import { assertAuthorized } from "./auth.ts";
import { parseTelegramUserId } from "./request.ts";

// Only what the caller sent comes back: no customer number, no dates, not even whether the account was new.
export interface LinkAccountReply { telegram_user_id: number; account: "ready" }

export async function handleLinkAccount(request: Request, env: Env, now: Date): Promise<LinkAccountReply> {
  assertAuthorized(request.headers.get("Authorization"), env.YMD_LINKS_SECRET);
  const telegramUserId = parseTelegramUserId((await readJsonObject(request)).telegram_user_id);
  if (telegramUserId === undefined) throw new HttpError("bad_request", "telegram_user_id is required");
  await ensureCustomer(env.DB, telegramUserId, now.toISOString());
  return { telegram_user_id: telegramUserId, account: "ready" };
}
