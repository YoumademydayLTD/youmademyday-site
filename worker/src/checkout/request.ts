// Validate what the site sends to POST /api/checkout. The browser sends only ids and a language, never amounts.
import { HttpError } from "../http/errors.ts";
import { requireOneOf, requireString, requireStringList } from "../http/fields.ts";
import { isDirectOffer, type Catalog } from "../catalog/index.ts";

export const CHECKOUT_KINDS = ["cart", "product", "plan"] as const;
export type CheckoutKind = (typeof CHECKOUT_KINDS)[number];
export type CheckoutRequest =
  | { kind: "cart"; ids: string[]; lang: string }
  | { kind: "product" | "plan"; id: string; lang: string };

export const MAX_CART_ITEMS = 60; // more than the whole catalogue: a longer list is not a real cart
const MAX_ID_LENGTH = 32;

function requireProduct(catalog: Catalog, id: string, lang: string) {
  const product = catalog.products[id];
  if (!product) throw new HttpError("unknown_item", `unknown product ${id}`);
  if (!product.langs.includes(lang)) throw new HttpError("unknown_item", `product ${id} is not sold on the ${lang} site`);
  return product;
}

function parseCart(body: Record<string, unknown>, catalog: Catalog, lang: string): CheckoutRequest {
  const ids = requireStringList(body, "ids", MAX_CART_ITEMS, MAX_ID_LENGTH);
  if (new Set(ids).size !== ids.length) throw new HttpError("bad_request", "ids must not repeat");
  for (const id of ids) {
    // Direct offers are sold alone on their own page in their own currency, never inside a cart.
    if (isDirectOffer(requireProduct(catalog, id, lang))) throw new HttpError("bad_request", `${id} is sold on its own page, not in a cart`);
  }
  return { kind: "cart", ids, lang };
}

export function parseCheckoutRequest(body: Record<string, unknown>, catalog: Catalog): CheckoutRequest {
  const kind = requireOneOf(body, "kind", CHECKOUT_KINDS);
  const lang = requireOneOf(body, "lang", catalog.langs);
  if (kind === "cart") return parseCart(body, catalog, lang);
  const id = requireString(body, "id", MAX_ID_LENGTH);
  if (kind === "product") requireProduct(catalog, id, lang);
  else if (!catalog.plans[id]) throw new HttpError("unknown_item", `unknown plan ${id}`);
  return { kind, id, lang };
}

/** Kinds the site may open now, from the LIVE_KINDS variable ("cart,product"). */
export const liveKinds = (value: string): Set<string> => new Set(value.split(",").map((k) => k.trim()).filter(Boolean));
