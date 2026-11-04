// Ask the payment worker for a payment page. The browser sends only ids and the site language;
// the worker owns every price and needs the visitor signed in with Telegram.
import { callStore, StoreError } from "./request.js";
import { LANG } from "../i18n/index.js";

/** URL of the payment page for an order: { kind: "cart", ids } or { kind: "product" | "plan", id }. */
export async function openCheckout(order) {
  const data = await callStore("/api/checkout", { method: "POST", body: { ...order, lang: LANG } });
  if (typeof data.url !== "string") throw new StoreError("no_url", 0);
  return data.url;
}
