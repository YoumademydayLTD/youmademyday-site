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
