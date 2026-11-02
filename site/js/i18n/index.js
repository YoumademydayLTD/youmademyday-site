// Active language for this page load: dictionary, direction, number formats and links.
// Missing keys fall back to English, then Hebrew, so a half-translated language never shows blanks.
import { LANGS, DEFAULT_LANG, langFromPath, prefixFor } from "./config.js";

export const LANG = langFromPath(location.pathname);
export const L = LANGS[LANG];

async function load(code, file) {
  try { return (await import(`./${code}/${file}.js`)).default; } catch { return null; }
}
const chain = [...new Set([LANG, DEFAULT_LANG, "he"])];
const dicts = (await Promise.all(chain.map((c) => load(c, "ui")))).filter(Boolean);
const legals = (await Promise.all(chain.map((c) => load(c, "legal")))).filter(Boolean);

/** Translate a key; {name} placeholders are filled from vars. */
export function t(key, vars = {}) {
  const raw = dicts.map((d) => d[key]).find((v) => v !== undefined);
  if (raw === undefined) return key;
  return String(raw).replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
}

/** A list value (arrays in the dictionary). */
export const tList = (key) => dicts.map((d) => d[key]).find(Array.isArray) || [];

/** Legal page content for this language: a function of the business details. */
export const legalFor = (biz) => legals[0](biz);

const money = new Intl.NumberFormat(L.locale, { style: "currency", currency: "ILS", maximumFractionDigits: 0 });
export const formatPrice = (amount) => money.format(Math.round(amount));
export const formatNumber = (n) => new Intl.NumberFormat(L.locale).format(n);

/** URL of the same page in another language. */
export function urlIn(code, route) {
  const r = route && route !== "home" ? `/${route}` : "/";
  return `${prefixFor(code)}${r}` || "/";
}

/** Clean address of this language's home page ("/" or "/he/"), used instead of a #home hash. */
export const HOME_URL = urlIn(LANG, "home").replace(/\/?$/, "/");

export function applyDocumentLanguage() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = L.dir;
}
