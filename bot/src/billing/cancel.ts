// Cancel a membership through the store worker (it owns payments): at once during the free trial, otherwise at the
// end of the paid period. Returns the new state, or null when the store could not cancel it.
import type { AppContext } from "../app/context.ts";
import { INTERNAL_HEADER } from "../internal/auth.ts";

const ERROR_CHARS = 200;

export interface CancelledMembership { id: string; planId: string | null; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean }

export async function cancelViaStore(ctx: AppContext, telegramId: number, subscriptionId: string): Promise<CancelledMembership | null> {
  let response: Response;
  try {
    response = await ctx.env.STORE.fetch(`${ctx.env.STORE_URL}/api/internal/subscriptions/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", [INTERNAL_HEADER]: ctx.env.YMD_INTERNAL_SECRET },
      body: JSON.stringify({ telegramId, subscriptionId }),
    });
  } catch (error) {
    console.error("billing: store unreachable for cancel", subscriptionId, error instanceof Error ? error.message : String(error));
    return null;
  }
  if (!response.ok) {
    console.error("billing: store cancel failed", subscriptionId, response.status, (await response.text()).slice(0, ERROR_CHARS));
    return null;
  }
  return (await response.json<{ membership: CancelledMembership }>()).membership;
}
