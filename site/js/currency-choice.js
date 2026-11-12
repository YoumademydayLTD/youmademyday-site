// Which currency a visitor starts in (pure, no browser state, so it is unit-tested: site/test/currency.test.mjs).
import { CURRENCIES, HOME_CURRENCY, HOME_CURRENCY_LANG, LANG_CURRENCY, REGION_CURRENCY } from "./i18n/config.js";

function regionOf(localeTag) {
  try {
    return new Intl.Locale(localeTag).region ?? null;
  } catch {
    return null; // not a valid locale tag: it says nothing about the region
  }
}

/** The first currency a list of browser locales ("en-CA", "fr") points at, or null. */
export function regionCurrency(locales) {
  for (const tag of locales) {
    const currency = REGION_CURRENCY[regionOf(tag)];
    if (currency) return currency;
  }
  return null;
}

/** Pure choice, so it can be tested: Hebrew is fixed, then the saved choice, the browser's region, the language. */
export function chooseCurrency({ lang, saved, locales }) {
  if (lang === HOME_CURRENCY_LANG) return HOME_CURRENCY;
  if (CURRENCIES.includes(saved)) return saved;
  return regionCurrency(locales) ?? LANG_CURRENCY[lang] ?? HOME_CURRENCY;
}
