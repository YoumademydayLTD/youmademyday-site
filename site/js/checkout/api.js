// Ask the payment worker for a payment page. The browser sends only ids, the site language and the currency
// the visitor sees; the worker owns every price and needs the visitor signed in with Telegram.
import { callStore, StoreError } from "./request.js";
import { LANG } from "../i18n/index.js";
import { CURRENCY } from "../currency.js";

/** URL of the payment page for an order: { kind: "cart", ids } or { kind: "product" | "plan", id }. */
export async function openCheckout(order) {
  const data = await callStore("/api/checkout", { method: "POST", body: { ...order, lang: LANG, currency: CURRENCY.toLowerCase() } });
  if (typeof data.url !== "string") throw new StoreError("no_url", 0);
  return data.url;
}
