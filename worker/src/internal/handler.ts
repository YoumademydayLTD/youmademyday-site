// POST /api/internal/subscriptions/cancel {telegramId, subscriptionId}: the bot's cancel button and /delete.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject } from "../http/response.ts";
import { requireString } from "../http/fields.ts";
import { findCustomerByTelegram } from "../customers/repo.ts";
import { cancelMembership } from "../account/membership.ts";
import type { MembershipView } from "../account/present.ts";
import { assertInternal } from "./auth.ts";

const MAX_ID_LENGTH = 64;

export async function handleInternalCancel(request: Request, env: Env, now: Date): Promise<{ membership: MembershipView }> {
  assertInternal(request, env.YMD_INTERNAL_SECRET);
  const body = await readJsonObject(request);
  const telegramId = body.telegramId;
  if (typeof telegramId !== "number" || !Number.isSafeInteger(telegramId)) throw new HttpError("bad_request", "telegramId must be an integer");
  const customer = await findCustomerByTelegram(env.DB, telegramId);
  if (!customer) throw new HttpError("not_found", "no such customer");
  return { membership: await cancelMembership(env, customer, requireString(body, "subscriptionId", MAX_ID_LENGTH), now) };
}
