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
// The site whose prices are always in shekels; the others show dollars for items that have a dollar price.
export const HOME_CURRENCY_LANG = "he";
// Currencies the store shows and charges in (owner, 12.11.2026). Shekels are the home currency; the price of every
// item in each other currency comes from tools/currency_prices.json (generated into the product files).
export const HOME_CURRENCY = "ILS";
export const CURRENCIES = ["ILS", "USD", "CAD", "EUR", "GBP", "AUD"];
// Where a foreign site starts when the visitor chose nothing and the browser's region is not in the table below.
export const LANG_CURRENCY = { en: "USD", fr: "EUR", ar: "USD", ru: "USD" };
const EURO_REGIONS = ["AT", "BE", "CY", "DE", "EE", "ES", "FI", "FR", "GR", "HR", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PT", "SI", "SK"];
// Browser region ("en-CA" → CA) → currency. It wins over the language: a French speaker in Canada sees Canadian dollars.
export const REGION_CURRENCY = { IL: "ILS", US: "USD", CA: "CAD", GB: "GBP", AU: "AUD", ...Object.fromEntries(EURO_REGIONS.map((region) => [region, "EUR"])) };
// Languages published on the site. A language joins once its whole catalogue is translated (tools/build_site.py reads this line).
export const LIVE = ["en", "he", "fr", "ar", "ru"];

/** Language code from a URL path: "/he/courses" → "he", "/courses" → "en". */
export function langFromPath(pathname) {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && first !== DEFAULT_LANG && first in LANGS ? first : DEFAULT_LANG;
}

/** Path prefix for a language: "" for the default, "/he" for Hebrew. */
export const prefixFor = (code) => (code === DEFAULT_LANG ? "" : `/${code}`);
