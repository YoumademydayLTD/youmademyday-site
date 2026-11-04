// Validate a CRX Platform request to POST /api/links: one product, an optional custom price and the
// caller's own metadata. Pure, so it is unit-tested.
import { HttpError } from "../http/errors.ts";
import { optionalString, requireString } from "../http/fields.ts";
import type { Currency } from "../catalog/index.ts";
import type { ProductMap } from "../polar/mapping.ts";

export interface LinkRequest {
  storeId: string;
  currency: Currency;
  amount?: number; // minor units; absent = the catalogue price
  metadata: Record<string, string>;
  customerEmail?: string;
  externalCustomerId?: string;
  lang?: string;
}

const CURRENCIES: readonly Currency[] = ["ils", "usd"];
const MINOR_UNITS = 100;
// Polar allows 50 metadata keys; ours (ymd_*) take a few, the caller gets the rest.
export const MAX_CALLER_KEYS = 40;
const MAX_KEY_LENGTH = 40;
const MAX_VALUE_LENGTH = 500;
export const RESERVED_PREFIX = "ymd_";
const MAX_ID_LENGTH = 64;
const MAX_EMAIL_LENGTH = 320;
const MAX_LANG_LENGTH = 8;
const MAX_AMOUNT_MAJOR = 100_000;

function parseAmount(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT_MAJOR) {
    throw new HttpError("bad_request", `amount must be a positive number of currency units up to ${MAX_AMOUNT_MAJOR}`);
  }
  const minor = Math.round(value * MINOR_UNITS);
  if (Math.abs(minor - value * MINOR_UNITS) > 1e-6) throw new HttpError("bad_request", "amount has more than 2 decimals");
  return minor;
}

function parseMetadata(value: unknown): Record<string, string> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) throw new HttpError("bad_request", "metadata must be an object of strings");
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > MAX_CALLER_KEYS) throw new HttpError("bad_request", `metadata has more than ${MAX_CALLER_KEYS} keys`);
  return Object.fromEntries(entries.map(([key, raw]) => {
    if (!key || key.length > MAX_KEY_LENGTH) throw new HttpError("bad_request", `metadata key "${key}" must be 1–${MAX_KEY_LENGTH} characters`);
    if (key.startsWith(RESERVED_PREFIX)) throw new HttpError("bad_request", `metadata keys starting with ${RESERVED_PREFIX} are reserved`);
    if (typeof raw !== "string" && typeof raw !== "number" && typeof raw !== "boolean") throw new HttpError("bad_request", `metadata.${key} must be a string, number or boolean`);
    const text = String(raw);
    if (text.length > MAX_VALUE_LENGTH) throw new HttpError("bad_request", `metadata.${key} is longer than ${MAX_VALUE_LENGTH} characters`);
    return [key, text];
  }));
}

export function parseLinkRequest(body: Record<string, unknown>, map: ProductMap): LinkRequest {
  const storeId = requireString(body, "product", MAX_ID_LENGTH);
  if (!map[storeId]) throw new HttpError("unknown_item", `unknown product ${storeId}`);
  const currency = body.currency === undefined ? "ils" : body.currency;
  if (typeof currency !== "string" || !(CURRENCIES as readonly string[]).includes(currency)) throw new HttpError("bad_request", `currency must be one of: ${CURRENCIES.join(", ")}`);
  const amount = parseAmount(body.amount);
  const customerEmail = optionalString(body, "customer_email", MAX_EMAIL_LENGTH);
  const externalCustomerId = optionalString(body, "external_customer_id", MAX_ID_LENGTH);
  const lang = optionalString(body, "lang", MAX_LANG_LENGTH);
  return {
    storeId, currency: currency as Currency, metadata: parseMetadata(body.metadata),
    ...(amount === undefined ? {} : { amount }),
    ...(customerEmail === undefined ? {} : { customerEmail }),
    ...(externalCustomerId === undefined ? {} : { externalCustomerId }),
    ...(lang === undefined ? {} : { lang }),
  };
}
