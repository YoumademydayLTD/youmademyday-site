// The personal area (#account): files, memberships and receipts of the signed-in visitor. Signed-out
// visitors get a short prompt to sign in and come straight back here afterwards. The data is fetched each
// time the page opens, because the download and receipt links are short-lived.
import { BIZ } from "../business.js";
import { $ } from "../util.js";
import { t } from "../i18n/index.js";
import { isSignedIn, signOutLocally } from "../telegram/session.js";
import { isLoginRequired } from "../checkout/request.js";
import { rememberIntent } from "../checkout/intent.js";
import { fetchAccount } from "./api.js";
import { librarySection } from "./library.js";
import { membershipsSection, membershipActions } from "./memberships.js";
import { invoicesSection } from "./invoices.js";

export const ACCOUNT_ROUTE = "account";
const ROOT_ID = "meRoot";

const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

const signedOutCard = () => `<div class="login-card login-done"><h2 style="font-size:28px">${t("acct.outH")}</h2><p class="muted">${t("acct.outP")}</p>
    <a class="btn btn-tg" href="#login" data-act="login-return" data-to="${ACCOUNT_ROUTE}">${icon("i-plane")}<span>${t("login.btn")}</span></a></div>`;

export function viewAccount() {
  const signed = isSignedIn();
  return `<div class="wrap page-head"><h1>${t("acct.title")}</h1><p class="muted" style="margin-top:10px;max-width:56ch">${t("acct.lead")}</p></div>
  <div class="wrap me-page" id="${ROOT_ID}" data-signed="${signed}">
    ${signed ? `<div id="meStatus" role="status" aria-live="polite" aria-busy="true"><p class="muted">${t("acct.loading")}</p></div><div id="meBody" class="me-body"></div>` : signedOutCard()}
  </div>`;
}

/** True when the page on screen was drawn for the other sign-in state, so main.js redraws it. */
export function isAccountStale() {
  const root = document.getElementById(ROOT_ID);
  return root !== null && root.dataset.signed !== String(isSignedIn());
}

// An expired session: forget it and come back here after the new sign-in. Dropping it redraws the page.
function handleLoginRequired(error) {
  if (!isLoginRequired(error)) return false;
  rememberIntent({ route: ACCOUNT_ROUTE });
  signOutLocally();
  return true;
}

function showError(status) {
  status.innerHTML = `<p>${t("acct.error", { email: `<b>${BIZ.email}</b>` })}</p><button class="btn btn-ghost btn-sm" type="button" data-act="account-retry" style="margin-top:10px">${t("acct.retry")}</button>`;
}

/** Called after the page is on screen: fetch the account and fill the three sections. */
export async function mountAccount() {
  const status = $("#meStatus");
  if (!status) return;
  status.setAttribute("aria-busy", "true");
  status.innerHTML = `<p class="muted">${t("acct.loading")}</p>`;
  try {
    const data = await fetchAccount();
    if (!status.isConnected) return;
    $("#meBody").innerHTML = librarySection(data.library) + membershipsSection(data.memberships) + invoicesSection(data.invoices);
    status.innerHTML = "";
  } catch (error) {
    if (!status.isConnected || handleLoginRequired(error)) return;
    console.error("account: could not load", error);
    showError(status);
  } finally {
    status.setAttribute("aria-busy", "false");
  }
}

/** Click actions for main.js's ACTIONS. */
export const ACCOUNT_ACTIONS = {
  ...membershipActions(handleLoginRequired),
  "account-retry": () => mountAccount(),
  // Any «sign in» button that should bring the visitor back to its page afterwards (data-to).
  "login-return": (el) => { rememberIntent({ route: el.dataset.to }); location.hash = "login"; },
};
