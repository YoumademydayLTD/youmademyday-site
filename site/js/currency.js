// The currency this visitor sees and pays in (owner, 12.11.2026). The Hebrew site is always in shekels.
// Elsewhere: the visitor's own choice (the picker in the footer), else the browser's region, else the site language.
import { LANG } from "./i18n/index.js";
import { CURRENCIES, HOME_CURRENCY_LANG } from "./i18n/config.js";
import { chooseCurrency } from "./currency-choice.js";

const STORAGE_KEY = "ymd-currency";

/** The Hebrew site has no picker: its prices stay in shekels with the VAT wording. */
export const canChooseCurrency = LANG !== HOME_CURRENCY_LANG;

function readSaved() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // storage blocked (private mode): fall back to the region and the language
  }
}

/** Remember the visitor's choice; the page reloads so every price is drawn again in it. */
export function saveCurrency(code) {
  if (!CURRENCIES.includes(code)) return;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // storage blocked: the choice cannot be kept, the site stays in its default currency
  }
}

const browserLocales = typeof navigator === "undefined" ? [] : navigator.languages ?? [navigator.language];

export const CURRENCY = chooseCurrency({ lang: LANG, saved: readSaved(), locales: browserLocales });
