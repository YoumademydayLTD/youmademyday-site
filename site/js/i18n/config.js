// Supported languages. English is the default and lives at the site root; the others under /<code>/.
// Owner decision 02.11.2026: en (default), he, fr, ar, ru. VAT wording shows only on the Hebrew site
// (sales to customers abroad carry no Israeli VAT; prices are the same).
export const LANGS = {
  en: { name: "English", dir: "ltr", locale: "en-US", showVat: false },
  he: { name: "עברית", dir: "rtl", locale: "he-IL", showVat: true },
  fr: { name: "Français", dir: "ltr", locale: "fr-FR", showVat: false },
  ar: { name: "العربية", dir: "rtl", locale: "ar", showVat: false },
  ru: { name: "Русский", dir: "ltr", locale: "ru-RU", showVat: false },
};
export const DEFAULT_LANG = "en";
// Languages published on the site. A language joins once its whole catalogue is translated (tools/build_site.py reads this line).
export const LIVE = ["en", "he", "fr"];

/** Language code from a URL path: "/he/courses" → "he", "/courses" → "en". */
export function langFromPath(pathname) {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && first !== DEFAULT_LANG && first in LANGS ? first : DEFAULT_LANG;
}

/** Path prefix for a language: "" for the default, "/he" for Hebrew. */
export const prefixFor = (code) => (code === DEFAULT_LANG ? "" : `/${code}`);
