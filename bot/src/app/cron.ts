// The 15-minute cron: queue due daily messages and charge reminders, deliver orders that got paid, send the
// queue at a paced rate, and clean up expired rows.
import type { AppContext } from "./context.ts";
import { MS_PER_SECOND, SECONDS_PER_DAY } from "../config/time.ts";
import { scheduleDaily } from "../daily/schedule.ts";
import { queueChargeReminders } from "../billing/charge-reminders.ts";
import { deliverPending } from "../library/order.ts";
import { drainOutbox } from "../outbox/drain.ts";
import { purgeFinished } from "../outbox/repo.ts";
import { purgeLogins } from "../login/repo.ts";
import { purgeSessions } from "../sessions/repo.ts";
import { purgeUpdates } from "../webhook/handler.ts";

// Finished outbox rows keep blocking duplicates for this long (longer than any dedupe key's day).
const KEEP_DAYS = 3;

async function step(name: string, run: () => Promise<unknown>): Promise<void> {
  try {
    const result = await run();
    if (result !== undefined) console.log(`cron: ${name}`, JSON.stringify(result));
  } catch (error) {
    console.error(`cron: ${name} failed`, error instanceof Error ? error.stack ?? error.message : String(error));
  }
}

export async function runCron(ctx: AppContext): Promise<void> {
  const before = new Date(ctx.now.getTime() - KEEP_DAYS * SECONDS_PER_DAY * MS_PER_SECOND).toISOString();
  await step("daily", () => scheduleDaily(ctx));
  await step("charges", () => queueChargeReminders(ctx));
  await step("pending orders", () => deliverPending(ctx));
  await step("outbox", () => drainOutbox(ctx));
  await step("cleanup", async () => {
    await purgeFinished(ctx.db, before);
    await purgeUpdates(ctx.db, before);
    await purgeLogins(ctx.db, ctx.nowSeconds);
    await purgeSessions(ctx.db, ctx.nowSeconds);
  });
}
