// Where Polar sends the buyer back to on the store site (pure).

/** "/he" for Hebrew, "" for the default language at the site root (same rule as prefixFor in site/js/i18n/config.js). */
export const langPrefix = (lang: string, defaultLang: string): string => (lang === defaultLang ? "" : `/${lang}`);

/** After payment: the site's thanks page; Polar fills in {CHECKOUT_ID}. */
export const successUrl = (siteUrl: string, prefix: string): string => `${siteUrl}${prefix}/#thanks-{CHECKOUT_ID}`;

/** The back button on Polar's page: the page the buyer came from. */
export const returnUrl = (siteUrl: string, prefix: string, hash: string): string => `${siteUrl}${prefix}/#${hash}`;
