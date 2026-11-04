// The pay button: open the payment page, or explain clearly why it did not open.
import { openCheckout } from "./api.js";
import { ALL } from "../catalog.js";
import { S, save } from "../state.js";
import { BIZ } from "../business.js";
import { t } from "../i18n/index.js";
import { toast } from "../util.js";

const orderFrom = (el) => (el.dataset.kind === "cart"
  ? { kind: "cart", ids: S.cart.filter((id) => ALL[id]) }
  : { kind: el.dataset.kind, id: el.dataset.id });

export async function startPayment(el) {
  if (el.disabled) return;
  const label = el.textContent;
  el.disabled = true;
  el.setAttribute("aria-busy", "true");
  el.textContent = t("pay.opening");
  try {
    const url = await openCheckout(orderFrom(el));
    // Remember what is being paid, so the thanks page empties the cart only after a cart payment.
    S.pending = el.dataset.kind;
    save();
    location.href = url;
  } catch (error) {
    console.error("payment page did not open:", error);
    toast(t("pay.error", { email: BIZ.email }));
    el.disabled = false;
    el.removeAttribute("aria-busy");
    el.textContent = label;
  }
}

/** After a successful payment: clear the cart if the cart was what was paid. */
export function completePayment() {
  if (S.pending === "cart") S.cart = [];
  S.pending = null;
  save();
}
