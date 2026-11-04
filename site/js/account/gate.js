// Pages that only a signed-in visitor can use (the personal area, the reader, the daily companion) share one
// gate: signed-out visitors get a short sign-in card that brings them straight back, and an expired session is
// forgotten so the page redraws into that card. The page root carries the sign-in state it was drawn for.
import { t } from "../i18n/index.js";
import { isSignedIn, signOutLocally } from "../telegram/session.js";
import { isLoginRequired } from "../checkout/request.js";
import { rememberIntent } from "../checkout/intent.js";

const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

/** Attributes for a gated page's root element. */
export const gateAttrs = () => `data-gate data-signed="${isSignedIn()}"`;

/** The «sign in to see this» card; after signing in the visitor comes back to route. */
export const signedOutCard = (route) => `<div class="login-card login-done"><h2 style="font-size:28px">${t("acct.outH")}</h2><p class="muted">${t("acct.outP")}</p>
    <a class="btn btn-tg" href="#login" data-act="login-return" data-to="${route}">${icon("i-plane")}<span>${t("login.btn")}</span></a></div>`;

/** True when the gated page on screen was drawn for the other sign-in state, so main.js redraws it. */
export function isGateStale() {
  const root = document.querySelector("[data-gate]");
  return root !== null && root.dataset.signed !== String(isSignedIn());
}

/**
 * A handler for a refused call: on an expired session it forgets the session and remembers route for after the
 * new sign-in (dropping the session redraws the page), and returns true. Any other error returns false.
 */
export const loginRequiredFor = (route) => (error) => {
  if (!isLoginRequired(error)) return false;
  rememberIntent({ route });
  signOutLocally();
  return true;
};
