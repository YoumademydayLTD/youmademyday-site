// Time zones the user can pick for the daily message. Most buyers are in Israel, so that is the default
// for every language except French (owner, 04.11.2026: «timezone default Asia/Jerusalem by language»).
import type { Lang } from "./langs.ts";

export const ZONES = ["Asia/Jerusalem", "Europe/London", "Europe/Paris", "Europe/Moscow", "Asia/Dubai", "America/New_York", "America/Los_Angeles"] as const;
export type Zone = (typeof ZONES)[number];

export const DEFAULT_ZONE: Record<Lang, Zone> = { he: "Asia/Jerusalem", en: "Asia/Jerusalem", fr: "Europe/Paris", ar: "Asia/Jerusalem", ru: "Asia/Jerusalem" };

export const isZone = (value: unknown): value is Zone => typeof value === "string" && (ZONES as readonly string[]).includes(value);

/** Hours the reminder picker offers. */
export const DAILY_HOURS = [6, 7, 8, 9, 10, 12, 14, 17, 19, 21] as const;
export const DEFAULT_DAILY_HOUR = 8;
// «Remind me in the evening» sends the morning message again at this local hour.
export const EVENING_HOUR = 20;
// …or this many hours later when the evening has already begun.
export const EVENING_FALLBACK_HOURS = 2;
