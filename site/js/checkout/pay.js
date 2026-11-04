// The pay button: open the payment page, or explain clearly why it did not open. Buying needs a Telegram
// sign-in (owner, 04.11.2026); a signed-out visitor is sent to the login page and the order waits for them.
import { openCheckout } from "./api.js";
import { isLoginRequired } from "./request.js";
import { rememberIntent } from "./intent.js";
import { isCheckoutLive } from "./config.js";
import { ALL } from "../catalog.js";
import { S, save } from "../state.js";
import { BIZ } from "../business.js";
import { t } from "../i18n/index.js";
import { toast } from "../util.js";
import { isSignedIn, signOutLocally } from "../telegram/session.js";

const PAY_BUTTON = '[data-act="pay"]';

const orderFrom = (el) => (el.dataset.kind === "cart"
  ? { kind: "cart", ids: S.cart.filter((id) => ALL[id]) }
  : { kind: el.dataset.kind, id: el.dataset.id });

// The intent is saved before an expired session is dropped: dropping it redraws the page.
function askToSignIn(order, route) {
  rememberIntent({ route, order });
  if (isSignedIn()) signOutLocally();
  toast(t("pay.loginFirst"));
  location.hash = "login";
}

/** Shows the button as busy; returns the function that puts it back. A missing button is fine. */
function markBusy(button) {
  if (!button) return () => {};
  const label = button.textContent;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = t("pay.opening");
  return () => {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.textContent = label;
  };
}

async function pay(order, route, button) {
  if (!isSignedIn()) { askToSignIn(order, route); return; }
  const restore = markBusy(button);
  try {
    const url = await openCheckout(order);
    // Remember what is being paid, so the thanks page empties the cart only after a cart payment.
    S.pending = order.kind;
    save();
    location.href = url;
  } catch (error) {
    restore();
    if (isLoginRequired(error)) { askToSignIn(order, route); return; }
    console.error("payment page did not open:", error);
    toast(t("pay.error", { email: BIZ.email }));
  }
}

/** The pay button was pressed on the page called route. */
export function startPayment(el, route) {
  if (el.disabled) return Promise.resolve();
  return pay(orderFrom(el), route, el);
}

/** Back from the sign-in: pay the saved order, on its own page (already on screen). */
export function resumePayment(order, route) {
  if (!isCheckoutLive(order.kind)) return Promise.resolve();
  toast(t("pay.resuming"));
  return pay(order, route, document.querySelector(PAY_BUTTON));
}

/** After a successful payment: clear the cart if the cart was what was paid. */
export function completePayment() {
  if (S.pending === "cart") S.cart = [];
  S.pending = null;
  save();
}
