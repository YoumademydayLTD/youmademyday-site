// The bot's languages: the site's five, picked from Telegram's language_code, English by default (owner, 04.11.2026).
export const LANGS = ["he", "en", "fr", "ar", "ru"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

export const isLang = (value: unknown): value is Lang => typeof value === "string" && (LANGS as readonly string[]).includes(value);

// Telegram sends IETF tags such as "he", "en-US" or "pt-br"; "iw" is the old code for Hebrew.
const ALIASES: Record<string, Lang> = { iw: "he" };

/** The bot language for a Telegram language_code. */
export function langFromTelegram(code: string | undefined): Lang {
  const base = (code ?? "").toLowerCase().split(/[-_]/)[0] ?? "";
  const lang = ALIASES[base] ?? base;
  return isLang(lang) ? lang : DEFAULT_LANG;
}

export const LANG_NAMES: Record<Lang, string> = { he: "עברית", en: "English", fr: "Français", ar: "العربية", ru: "Русский" };

/** Path prefix of a language on the site: English lives at the root (same rule as site/js/i18n/config.js). */
export const sitePrefix = (lang: Lang): string => (lang === DEFAULT_LANG ? "" : `/${lang}`);

/** A page of the site in the user's language, e.g. https://youmademyday.store/he/#terms. */
export const sitePage = (siteUrl: string, lang: Lang, route = ""): string =>
  `${new URL(siteUrl).origin}${sitePrefix(lang)}/${route ? `#${route}` : ""}`;
