// Sends due outbox messages at a paced rate: 429 pauses everything for retry_after, a blocked user is marked and
// skipped, other failures retry a few times.
import type { AppContext } from "../app/context.ts";
import { tick } from "../app/context.ts";
import { TelegramError } from "../telegram/api.ts";
import { markBlocked } from "../telegram/send.ts";
import { findUser } from "../users/repo.ts";
import { sendQueued } from "../daily/send.ts";
import { MS_PER_SECOND, SECONDS_PER_MINUTE } from "../config/time.ts";
import { markSent, newPacer, nextSlot, pauseFor } from "./pacer.ts";
import { finish, listDue, retryLater } from "./repo.ts";

const BATCH = 500;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_SECONDS = 5 * SECONDS_PER_MINUTE;
// Stop well inside the cron run's time; what is left goes in the next run, 15 minutes later.
export const DRAIN_BUDGET_MS = 10 * SECONDS_PER_MINUTE * MS_PER_SECOND;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function drainOutbox(start: AppContext, budgetMs = DRAIN_BUDGET_MS): Promise<{ sent: number; failed: number }> {
  const pacer = newPacer();
  const deadline = Date.now() + budgetMs;
  let sent = 0;
  let failed = 0;
  for (const item of await listDue(start.db, start.nowSeconds, BATCH)) {
    const at = nextSlot(pacer, item.telegramId, Date.now());
    if (at > deadline) break;
    if (at > Date.now()) await sleep(at - Date.now());
    const ctx = tick(start);
    const user = await findUser(ctx.db, item.telegramId);
    if (!user || user.isBlocked) { await finish(ctx.db, item.id, ctx.nowIso); continue; }
    try {
      await sendQueued(ctx, user, item.payload);
      markSent(pacer, item.telegramId, Date.now());
      await finish(ctx.db, item.id, ctx.nowIso);
      sent += 1;
    } catch (error) {
      failed += 1;
      if (error instanceof TelegramError && error.isRateLimit) {
        pauseFor(pacer, error.retryAfter ?? 1, Date.now());
        await retryLater(ctx.db, item.id, ctx.nowSeconds + (error.retryAfter ?? 1));
      } else if (error instanceof TelegramError && error.isBlocked) {
        await markBlocked(ctx, item.telegramId);
        await finish(ctx.db, item.id, ctx.nowIso);
      } else if (item.attempts + 1 >= MAX_ATTEMPTS) {
        console.error("outbox: giving up", item.id, error instanceof Error ? error.message : String(error));
        await finish(ctx.db, item.id, ctx.nowIso);
      } else {
        console.error("outbox: will retry", item.id, error instanceof Error ? error.message : String(error));
        await retryLater(ctx.db, item.id, ctx.nowSeconds + RETRY_DELAY_SECONDS);
      }
    }
  }
  return { sent, failed };
}
