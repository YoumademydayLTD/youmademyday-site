// How a membership reads in the bot, and which can be cancelled (pure).
import type { Lang } from "../config/langs.ts";
import { planName, t } from "../i18n/index.ts";
import { formatDay } from "./charge-format.ts";
import type { UserSubscription } from "./subscriptions.ts";

const TRIAL = "trialing";

export const canCancel = (s: UserSubscription): boolean => (s.status === "active" || s.status === TRIAL) && !s.cancelAtPeriodEnd;

export function membershipLine(lang: Lang, s: UserSubscription): string {
  const plan = planName(lang, s.planId ?? "");
  const date = s.currentPeriodEnd ? formatDay(lang, s.currentPeriodEnd) : "—";
  if (s.cancelAtPeriodEnd) return t(lang, "subEnding", { plan, date });
  return t(lang, s.status === TRIAL ? "subTrial" : "subActive", { plan, date });
}

/** The confirm question: a trial ends at once with no charge, a paid period runs to its end. */
export function cancelQuestion(lang: Lang, s: UserSubscription): string {
  const plan = planName(lang, s.planId ?? "");
  if (s.status === TRIAL) return t(lang, "subCancelAskTrial", { plan });
  return t(lang, "subCancelAskPaid", { plan, date: s.currentPeriodEnd ? formatDay(lang, s.currentPeriodEnd) : "—" });
}
