// The bundled price catalogue: the server's only source of amounts (never the browser).
import data from "./catalog.json";
import type { Catalog } from "./types.ts";

// JSON literals widen "week" to string; the file is generated from typed data and checked by test/catalog-sync.test.ts.
export const CATALOG = data as Catalog;
export type { Business, Catalog, CatalogPlan, CatalogProduct, Currency, CurrencyPrices } from "./types.ts";
export { currencyFor, cartCurrency, cartTotal, priceIn, toMinor, isBook, isDirectOffer, HOME_CURRENCY, type Priced } from "./pricing.ts";
