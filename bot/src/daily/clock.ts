// Local wall-clock time in an IANA zone, and when the daily and evening messages are due (pure; "now" is passed in).
import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE, unixSeconds } from "../config/time.ts";

export interface LocalTime { date: string; hour: number; minute: number } // date: YYYY-MM-DD

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(zone: string): Intl.DateTimeFormat {
  let f = formatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    formatters.set(zone, f);
  }
  return f;
}

export function localTime(now: Date, zone: string): LocalTime {
  const parts = Object.fromEntries(formatter(zone).formatToParts(now).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

export interface DailySchedule { timeZone: string; dailyHour: number; lastDailyDate: string | null; isPaused: boolean }

/** Due once per local day, from the chosen hour on (a cron run every 15 minutes picks it up). */
export function isDailyDue(schedule: DailySchedule, now: Date): boolean {
  if (schedule.isPaused) return false;
  const local = localTime(now, schedule.timeZone);
  return local.hour >= schedule.dailyHour && schedule.lastDailyDate !== local.date;
}

/** Yesterday's local date for a YYYY-MM-DD date (calendar arithmetic, no zone needed). */
export function previousDate(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Unix seconds of the next evening reminder: today at eveningHour local time, or fallbackHours from now when
 * that has passed. A daylight-saving change between now and the evening can move it by that hour, which is fine for a reminder.
 */
export function eveningSendAt(now: Date, zone: string, eveningHour: number, fallbackHours: number): number {
  const local = localTime(now, zone);
  const nowSeconds = unixSeconds(now);
  if (local.hour >= eveningHour) return nowSeconds + fallbackHours * SECONDS_PER_HOUR;
  const secondsToEvening = ((eveningHour - local.hour) * SECONDS_PER_MINUTE - local.minute) * SECONDS_PER_MINUTE;
  return nowSeconds - now.getUTCSeconds() + secondsToEvening;
}
