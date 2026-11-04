// Tell the bot that an order was paid, so it sends the files to the buyer's Telegram chat right away.
import type { Env } from "../env.ts";
import { INTERNAL_HEADER } from "./auth.ts";

export async function notifyBotOrderPaid(env: Env, checkoutId: string, telegramId: number): Promise<void> {
  const response = await env.BOT.fetch(`${env.BOT_URL}/api/internal/orders/paid`, {
    method: "POST",
    headers: { "Content-Type": "application/json", [INTERNAL_HEADER]: env.YMD_INTERNAL_SECRET },
    body: JSON.stringify({ checkoutId, telegramId }),
  });
  if (!response.ok) throw new Error(`bot order delivery ${response.status}: ${(await response.text()).slice(0, 200)}`);
}
