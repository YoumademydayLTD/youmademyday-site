// Pure rules for the personal area: what a membership's state is called, whether a next charge is shown,
// and how the worker's amounts and dates become display values. No DOM, no dictionary, so it is unit tested.

const MINOR_UNITS = 100; // the worker sends amounts in cents / agorot
const PAY_ISSUE = new Set(["past_due", "unpaid"]);
const RUNNING = new Set(["active", "trialing"]);

/**
 * The state of a membership as the page names it:
 * { key: "trial" | "active" | "ending" | "canceled" | "payIssue" | "incomplete", date, hasNextCharge }.
 * date is the ISO date the state talks about (the end of the paid period or of the free day), or null.
 */
export function membershipState(m) {
  const date = m.currentPeriodEnd ?? null;
  if (m.status === "canceled") return { key: "canceled", date: null, hasNextCharge: false };
  if (PAY_ISSUE.has(m.status)) return { key: "payIssue", date: null, hasNextCharge: false };
  if (!RUNNING.has(m.status)) return { key: "incomplete", date: null, hasNextCharge: false };
  if (m.cancelAtPeriodEnd) return { key: "ending", date, hasNextCharge: false };
  const isTrial = m.isTrial === true || m.status === "trialing";
  return { key: isTrial ? "trial" : "active", date, hasNextCharge: date !== null };
}

/** True while cancelling would end it at once with no charge (the free first day). */
export const isTrialMembership = (m) => m.isTrial === true || m.status === "trialing";

/** { amount, currency } for formatMoney: major units and an ISO currency code, or null when unknown. */
export function moneyOf(amount, currency) {
  if (typeof amount !== "number" || typeof currency !== "string" || !currency) return null;
  return { amount: amount / MINOR_UNITS, currency: currency.toUpperCase() };
}

/** A date for people ("4 November 2026"), or "" for a missing or broken value. */
export function formatDate(iso, locale) {
  const date = new Date(iso ?? "");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(date);
}
