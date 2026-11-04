// Ask the payment worker for a payment page. The browser sends only ids and the site language;
// the worker owns every price.
import { API_BASE } from "./config.js";
import { LANG } from "../i18n/index.js";

const TIMEOUT_MS = 15000;

/** URL of the payment page for an order: { kind: "cart", ids } or { kind: "product" | "plan", id }. */
export async function openCheckout(order) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...order, lang: LANG }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.url !== "string") throw new Error(data.error || `http ${response.status}`);
    return data.url;
  } finally {
    clearTimeout(timer);
  }
}
