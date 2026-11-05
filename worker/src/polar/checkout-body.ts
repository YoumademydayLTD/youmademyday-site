// The body of POST /v1/checkouts/ as we send it (only the fields we use).
import type { Currency } from "../catalog/index.ts";

// Currencies we charge in: the catalogue's own (ils, usd) and those only CRX links use (gel; owner, 04.11.2026).
// Polar accepts every one of them as a presentment currency (PresentmentCurrency in its OpenAPI spec).
export type PolarCurrency = Currency | "gel";
export type TrialInterval = "day" | "week" | "month" | "year";

// Hebrew prices include VAT (owner, 04.11.2026): every price we create is tax-inclusive.
export const TAX_BEHAVIOR = "inclusive";

export interface AdHocPrice { amount_type: "fixed"; price_amount: number; price_currency: PolarCurrency; tax_behavior: typeof TAX_BEHAVIOR }
export interface PolarCheckoutBody {
  products: string[];
  currency: PolarCurrency;
  prices?: Record<string, AdHocPrice[]>;
  success_url?: string;
  return_url?: string;
  locale?: string;
  allow_discount_codes: boolean;
  metadata: Record<string, string>;
  customer_email?: string;
  external_customer_id?: string;
  customer_billing_address?: { country: string };
  customer_ip_address?: string;
  // A checkout trial overrides the product's own (https://polar.sh/docs/features/subscriptions/trials).
  trial_interval?: TrialInterval;
  trial_interval_count?: number;
}

export const adHocPrice = (amount: number, currency: PolarCurrency): AdHocPrice =>
  ({ amount_type: "fixed", price_amount: amount, price_currency: currency, tax_behavior: TAX_BEHAVIOR });

// The languages Polar's payment page has (https://polar.sh/docs/features/checkout/localization, read 05.11.2026); Hebrew
// is not among them. Without a locale Polar follows the buyer's browser, and a buyer on the «עריכה» link saw Spanish card
// errors (owner, 05.11.2026), so every checkout now names its locale: the site's language when Polar has it, else English.
const POLAR_LOCALES: ReadonlySet<string> = new Set(["en", "nl", "es", "fr", "sv", "de", "hu", "it", "pt", "pt-PT", "ko", "ja", "tr", "pl", "zh-TW"]);
const FALLBACK_LOCALE = "en";

/** The locale to send Polar for a site language (always one Polar has, so the page never follows the browser). */
export const polarLocale = (lang: string | undefined): string => (lang !== undefined && POLAR_LOCALES.has(lang) ? lang : FALLBACK_LOCALE);
