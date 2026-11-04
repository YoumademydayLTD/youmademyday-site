// Admin rules (pure): the one-time claim with the code from Site/.env.bot, and the guard on every admin request.
import { timingSafeEqualText } from "../http/crypto.ts";

const MIN_CLAIM_CODE_LENGTH = 16;

export type ClaimResult = "claimed" | "already-claimed" | "wrong-code" | "disabled";

/** "/admin <code>": works once, with the exact code, and only when a long enough code is configured. */
export function evaluateClaim(input: { configuredCode: string; givenCode: string; isClaimed: boolean }): ClaimResult {
  if (input.configuredCode.length < MIN_CLAIM_CODE_LENGTH) return "disabled";
  if (input.isClaimed) return "already-claimed";
  return timingSafeEqualText(input.givenCode, input.configuredCode) ? "claimed" : "wrong-code";
}

/** The admin session's user, when that user is still an admin. */
export function adminFrom(session: { telegramId: number; scope: string } | null, adminIds: ReadonlySet<number>): number | null {
  if (!session || session.scope !== "admin" || !adminIds.has(session.telegramId)) return null;
  return session.telegramId;
}
