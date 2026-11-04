// Pure formatting helpers (no DOM). Time and place come in as parameters so tests can pin them.
import { DAYS_PER_WEEK, LOCALE, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from './constants.js';

/**
 * @typedef {object} Clock
 * @property {number} now epoch milliseconds
 * @property {string} [timeZone] IANA zone; the browser's when omitted
 */

/**
 * Calendar day number (days since epoch) of an instant in a time zone.
 * @param {number} ms
 * @param {string | undefined} timeZone
 */
function dayNumber(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms);
  const [year, month, day] = parts.split('-').map(Number);
  return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/**
 * Inbox-style time: «עכשיו», minutes ago, the hour today, «אתמול», the weekday this week, else the date.
 * @param {string} iso
 * @param {Clock} clock
 * @returns {string}
 */
export function formatListTime(iso, clock) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const diff = clock.now - ms;
  if (diff < MS_PER_MINUTE) return 'עכשיו';
  if (diff < MS_PER_HOUR) return `לפני ${Math.floor(diff / MS_PER_MINUTE)} דק׳`;
  const days = dayNumber(clock.now, clock.timeZone) - dayNumber(ms, clock.timeZone);
  if (days <= 0) return formatClock(iso, clock.timeZone);
  if (days === 1) return 'אתמול';
  if (days < DAYS_PER_WEEK) return new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: clock.timeZone }).format(ms);
  return formatShortDate(iso, clock.timeZone);
}

/**
 * @param {string} iso
 * @param {string} [timeZone]
 */
export function formatClock(iso, timeZone) {
  return new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(Date.parse(iso));
}

/**
 * @param {string} iso
 * @param {string} [timeZone]
 */
export function formatShortDate(iso, timeZone) {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'numeric', year: '2-digit', timeZone }).format(Date.parse(iso));
}

/**
 * @param {string | null | undefined} iso
 * @param {string} [timeZone]
 */
export function formatLongDate(iso, timeZone) {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone }).format(ms);
}

/**
 * Chat day separator: «היום», «אתמול» or the full date.
 * @param {string} iso
 * @param {Clock} clock
 */
export function formatDayLabel(iso, clock) {
  const days = dayNumber(clock.now, clock.timeZone) - dayNumber(Date.parse(iso), clock.timeZone);
  if (days <= 0) return 'היום';
  if (days === 1) return 'אתמול';
  return formatLongDate(iso, clock.timeZone);
}

/**
 * Whether two instants fall on the same calendar day in a zone.
 * @param {string} a
 * @param {string} b
 * @param {string} [timeZone]
 */
export function isSameDay(a, b, timeZone) {
  return dayNumber(Date.parse(a), timeZone) === dayNumber(Date.parse(b), timeZone);
}

/**
 * Money from minor units. The exponent comes from the currency itself (ILS 2, JPY 0), never a fixed /100.
 * @param {number} total minor units
 * @param {string | null | undefined} currency ISO 4217 code
 * @returns {string}
 */
export function formatMoney(total, currency) {
  if (!currency) return new Intl.NumberFormat(LOCALE).format(total);
  let formatter;
  try {
    formatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency });
  } catch (error) {
    // An unknown code is a data problem, not a reason to hide the purchase: show the raw amount and code.
    if (error instanceof RangeError) return `${new Intl.NumberFormat(LOCALE).format(total)} ${currency}`;
    throw error;
  }
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 0;
  return formatter.format(total / 10 ** digits);
}

/**
 * Daily reminder hour (0–23) as «08:00».
 * @param {number | null | undefined} hour
 */
export function formatHour(hour) {
  if (hour === null || hour === undefined) return '—';
  return `${String(hour).padStart(2, '0')}:00`;
}

/**
 * First letter of a name for the avatar circle (a whole grapheme, so emoji and accents stay intact).
 * @param {string | null | undefined} name
 */
export function initialOf(name) {
  const first = [...new Intl.Segmenter().segment((name ?? '').trim())][0];
  return first ? first.segment.toUpperCase() : '?';
}

/**
 * Cuts text to a length on a whole character, adding an ellipsis.
 * @param {string} text
 * @param {number} max
 */
export function truncate(text, max) {
  const chars = [...text];
  return chars.length <= max ? text : `${chars.slice(0, max).join('').trimEnd()}…`;
}
