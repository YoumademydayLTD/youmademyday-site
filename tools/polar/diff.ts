// Compare a wanted product with what Polar has and decide the one call that makes them equal (pure).
import { YMD_ID_KEY, type Currency, type PriceSpec, type ProductSpec } from "./specs.ts";

// Hebrew prices already include VAT (owner, 04.11.2026), so every price is tax-inclusive: 147 is the total.
export const TAX_BEHAVIOR = "inclusive";
const TRIAL_UNIT = "day";
const INTERVAL_COUNT = 1;

export interface PolarPrice {
  id: string;
  amount_type: string;
  price_currency: string;
  price_amount?: number;
  tax_behavior: string | null;
  is_archived: boolean;
}
export interface PolarProduct {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  is_archived: boolean;
  recurring_interval: string | null;
  trial_interval: string | null;
  trial_interval_count: number | null;
  metadata: Record<string, string | number | boolean>;
  prices: PolarPrice[];
}

export type SyncAction =
  | { kind: "create"; body: Record<string, unknown> }
  | { kind: "update"; id: string; body: Record<string, unknown>; changed: string[] }
  | { kind: "same"; id: string }
  | { kind: "error"; message: string };

const newPrice = (p: PriceSpec) => ({ amount_type: "fixed", price_amount: p.amount, price_currency: p.currency, tax_behavior: TAX_BEHAVIOR });

/** The active price of a product that matches a wanted price exactly, if any. */
export function matchingPrice(prices: PolarPrice[], wanted: PriceSpec): PolarPrice | undefined {
  return prices.find((p) => !p.is_archived && p.amount_type === "fixed" && p.price_currency === wanted.currency
    && p.price_amount === wanted.amount && p.tax_behavior === TAX_BEHAVIOR);
}

const trialFields = (spec: ProductSpec) => (spec.trialDays
  ? { trial_interval: TRIAL_UNIT, trial_interval_count: spec.trialDays }
  : { trial_interval: null, trial_interval_count: null });

export function createBody(spec: ProductSpec): Record<string, unknown> {
  return {
    name: spec.name,
    description: spec.description,
    visibility: spec.visibility,
    metadata: { [YMD_ID_KEY]: spec.ymdId },
    prices: spec.prices.map(newPrice),
    ...(spec.recurring ? { recurring_interval: spec.recurring, recurring_interval_count: INTERVAL_COUNT, ...trialFields(spec) } : {}),
  };
}

function pricesChanged(spec: ProductSpec, existing: PolarProduct): boolean {
  const active = existing.prices.filter((p) => !p.is_archived);
  return active.length !== spec.prices.length || spec.prices.some((p) => !matchingPrice(active, p));
}

export function diffProduct(spec: ProductSpec, existing: PolarProduct | undefined): SyncAction {
  if (!existing) return { kind: "create", body: createBody(spec) };
  if (existing.is_archived) return { kind: "error", message: `${spec.ymdId}: the Polar product ${existing.id} is archived; unarchive it in Polar or remove its ymd_id` };
  if ((existing.recurring_interval ?? null) !== spec.recurring) {
    return { kind: "error", message: `${spec.ymdId}: Polar has interval ${existing.recurring_interval ?? "one-time"}, the site wants ${spec.recurring ?? "one-time"}; an interval cannot change in place` };
  }
  const body: Record<string, unknown> = {};
  if (existing.name !== spec.name) body.name = spec.name;
  if ((existing.description ?? "") !== spec.description) body.description = spec.description;
  if (existing.visibility !== spec.visibility) body.visibility = spec.visibility;
  if (spec.recurring) {
    const trial = trialFields(spec);
    if (existing.trial_interval !== trial.trial_interval || existing.trial_interval_count !== trial.trial_interval_count) Object.assign(body, trial);
  }
  // A price list on update replaces the old one: keep unchanged prices by id so their ids stay stable.
  if (pricesChanged(spec, existing)) {
    body.prices = spec.prices.map((p) => {
      const kept = matchingPrice(existing.prices, p);
      return kept ? { id: kept.id } : newPrice(p);
    });
  }
  const changed = Object.keys(body);
  return changed.length ? { kind: "update", id: existing.id, body, changed } : { kind: "same", id: existing.id };
}

export interface MappedPrice { id: string; amount: number }
export interface MappedProduct { productId: string; recurring: string | null; prices: Partial<Record<Currency, MappedPrice>> }

/** The mapping entry the worker reads, from the product as Polar now has it. */
export function mapProduct(spec: ProductSpec, product: PolarProduct): MappedProduct {
  const prices: Partial<Record<Currency, MappedPrice>> = {};
  for (const wanted of spec.prices) {
    const price = matchingPrice(product.prices, wanted);
    if (!price) throw new Error(`${spec.ymdId}: Polar product ${product.id} has no active ${wanted.currency} price of ${wanted.amount}`);
    prices[wanted.currency] = { id: price.id, amount: wanted.amount };
  }
  return { productId: product.id, recurring: spec.recurring, prices };
}
