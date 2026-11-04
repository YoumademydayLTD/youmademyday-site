// What every handler gets: the environment, the Bot API client and the current time (passed in, so it is testable).
import type { Env } from "../env.ts";
import { createTelegram, type Telegram } from "../telegram/api.ts";
import { unixSeconds } from "../config/time.ts";

export interface AppContext {
  env: Env;
  db: D1Database;
  tg: Telegram;
  now: Date;
  nowIso: string;
  nowSeconds: number;
  waitUntil: (promise: Promise<unknown>) => void;
}

export function createContext(env: Env, now: Date, waitUntil: (promise: Promise<unknown>) => void): AppContext {
  return { env, db: env.DB, tg: createTelegram(env.TELEGRAM_BOT_TOKEN), now, nowIso: now.toISOString(), nowSeconds: unixSeconds(now), waitUntil };
}

/** A fresh clock reading inside a long-running request (long-poll loops). */
export const tick = (ctx: AppContext): AppContext => {
  const now = new Date();
  return { ...ctx, now, nowIso: now.toISOString(), nowSeconds: unixSeconds(now) };
};
