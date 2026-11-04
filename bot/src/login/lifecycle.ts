// Sign-in records and their rules (pure): a deep-link token the user confirms in the bot, or a 6-digit code
// the bot gives on /login. Both are valid 5 minutes and work once (site login page promise).
import { SECONDS_PER_MINUTE } from "../config/time.ts";

export const LOGIN_TTL_SECONDS = 5 * SECONDS_PER_MINUTE;
export const CODE_LENGTH = 6;
export const CODE_PREFIX = "code:";
// Wrong codes allowed from one client per window before /api/login/verify answers 429.
export const MAX_FAILED_CODES = 8;
export const FAILED_CODE_WINDOW_SECONDS = 10 * SECONDS_PER_MINUTE;

export type LoginKind = "link" | "code";
export type LoginStatus = "pending" | "confirmed" | "used";
// A deep link is made for one sign-in; codes from /login are typed by the user into their own browser, so they serve both.
export type LoginScope = "site" | "admin";
export interface LoginRecord { id: string; kind: LoginKind; scope: LoginScope; telegramId: number | null; status: LoginStatus; expiresAt: number }

export const isValidCode = (code: string): boolean => new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code);
export const codeId = (code: string): string => `${CODE_PREFIX}${code}`;

export function newLink(token: string, scope: LoginScope, nowSeconds: number): LoginRecord {
  return { id: token, kind: "link", scope, telegramId: null, status: "pending", expiresAt: nowSeconds + LOGIN_TTL_SECONDS };
}

/** A code is created already bound to the Telegram user who asked for it. */
export function newCode(code: string, telegramId: number, nowSeconds: number): LoginRecord {
  return { id: codeId(code), kind: "code", scope: "site", telegramId, status: "confirmed", expiresAt: nowSeconds + LOGIN_TTL_SECONDS };
}

export const isExpired = (record: LoginRecord, nowSeconds: number): boolean => record.expiresAt <= nowSeconds;

/** The user tapped «confirm» in the bot. Only a pending, unexpired link can be confirmed. */
export function confirmLink(record: LoginRecord, telegramId: number, nowSeconds: number): LoginRecord | null {
  if (record.kind !== "link" || record.status !== "pending" || isExpired(record, nowSeconds)) return null;
  return { ...record, telegramId, status: "confirmed" };
}

export type WaitResult = { status: "pending" } | { status: "expired" } | { status: "ready"; telegramId: number };

/** What a long-poll of this scope sees for a link. A used link, or one made for the other scope, reads as expired. */
export function linkState(record: LoginRecord | null, scope: LoginScope, nowSeconds: number): WaitResult {
  if (!record || record.kind !== "link" || record.scope !== scope || record.status === "used") return { status: "expired" };
  if (record.status === "confirmed" && record.telegramId !== null) return { status: "ready", telegramId: record.telegramId };
  return isExpired(record, nowSeconds) ? { status: "expired" } : { status: "pending" };
}

/** The Telegram user a code signs in, or null when it is unknown, used or expired. */
export function redeemCode(record: LoginRecord | null, nowSeconds: number): number | null {
  if (!record || record.kind !== "code" || record.status !== "confirmed" || isExpired(record, nowSeconds)) return null;
  return record.telegramId;
}

/** Too many wrong codes from one client in the window. */
export const isThrottled = (failedInWindow: number): boolean => failedInWindow >= MAX_FAILED_CODES;
