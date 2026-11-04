// Store id → Polar product and price ids, written by tools/polar_sync.ts.
import data from "./products.json";
import type { PolarCurrency } from "./checkout-body.ts";

export interface MappedPrice { id: string; amount: number }
export interface MappedProduct { productId: string; recurring: string | null; prices: Partial<Record<PolarCurrency, MappedPrice>> }
export type ProductMap = Record<string, MappedProduct>;

export const PRODUCT_MAP: ProductMap = data as ProductMap;
export const PLAN_ID_PREFIX = "plan-";
export const STORE_ORDER_ID = "store-order";

/** Our store id for a Polar product id, if it is one of ours. */
export function storeIdOf(map: ProductMap, polarProductId: string): string | undefined {
  return Object.entries(map).find(([, mapped]) => mapped.productId === polarProductId)?.[0];
}
