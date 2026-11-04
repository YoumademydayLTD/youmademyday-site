// Send pacing under Telegram's limits (pure; times are passed in): about 30 messages a second overall and one
// a second per chat (https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this).
// We stay a little under the global limit, and a 429 pauses everything for its retry_after.
import { MS_PER_SECOND } from "../config/time.ts";

export const GLOBAL_PER_SECOND = 25;
export const PER_CHAT_INTERVAL_MS = MS_PER_SECOND;

export interface PacerState {
  recent: number[]; // send times (ms) inside the last second, oldest first
  lastByChat: Map<number, number>;
  blockedUntil: number;
}

export const newPacer = (): PacerState => ({ recent: [], lastByChat: new Map(), blockedUntil: 0 });

/** The earliest time (ms) a message to this chat may go, at or after `now`. */
export function nextSlot(state: PacerState, chatId: number, now: number): number {
  let at = Math.max(now, state.blockedUntil);
  const last = state.lastByChat.get(chatId);
  if (last !== undefined) at = Math.max(at, last + PER_CHAT_INTERVAL_MS);
  const window = state.recent.filter((t) => t > at - MS_PER_SECOND);
  if (window.length >= GLOBAL_PER_SECOND) {
    const oldest = window[window.length - GLOBAL_PER_SECOND] ?? at;
    at = Math.max(at, oldest + MS_PER_SECOND);
  }
  return at;
}

/** Records a send at `at` (ms). */
export function markSent(state: PacerState, chatId: number, at: number): void {
  state.recent = [...state.recent.filter((t) => t > at - MS_PER_SECOND), at];
  state.lastByChat.set(chatId, at);
}

/** Telegram answered 429: nothing is sent before retry_after seconds have passed. */
export function pauseFor(state: PacerState, retryAfterSeconds: number, now: number): void {
  state.blockedUntil = Math.max(state.blockedUntil, now + retryAfterSeconds * MS_PER_SECOND);
}
