// The body of POST /v1/checkouts/ as we send it (only the fields we use).
import type { Currency } from "../catalog/index.ts";

// Hebrew prices include VAT (owner, 04.11.2026): every price we create is tax-inclusive.
export const TAX_BEHAVIOR = "inclusive";

export interface AdHocPrice { amount_type: "fixed"; price_amount: number; price_currency: Currency; tax_behavior: typeof TAX_BEHAVIOR }
export interface PolarCheckoutBody {
  products: string[];
  currency: Currency;
  prices?: Record<string, AdHocPrice[]>;
  success_url?: string;
  return_url?: string;
  locale?: string;
  allow_discount_codes: boolean;
  metadata: Record<string, string>;
  customer_email?: string;
  external_customer_id?: string;
}

export const adHocPrice = (amount: number, currency: Currency): AdHocPrice =>
  ({ amount_type: "fixed", price_amount: amount, price_currency: currency, tax_behavior: TAX_BEHAVIOR });
