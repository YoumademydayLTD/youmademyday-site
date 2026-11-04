// Date and amount of a charge reminder in the user's language (pure).
import type { Lang } from "../config/langs.ts";
import { MINOR_PER_UNIT } from "../config/money.ts";

const LOCALES: Record<Lang, string> = { he: "he-IL", en: "en-US", fr: "fr-FR", ar: "ar", ru: "ru-RU" };

/** "11 November" in the user's language (Israel time, where the store runs). */
export const formatDay = (lang: Lang, iso: string): string =>
  new Intl.DateTimeFormat(LOCALES[lang], { day: "numeric", month: "long", timeZone: "Asia/Jerusalem" }).format(new Date(iso));

export function formatCharge(lang: Lang, periodEnd: string, amountMinor: number, currency: string): { date: string; amount: string } {
  const locale = LOCALES[lang];
  const date = formatDay(lang, periodEnd);
  const amount = new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(amountMinor / MINOR_PER_UNIT);
  return { date, amount };
}
