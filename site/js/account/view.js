// The personal area (#account): files, the daily companion, memberships and receipts of the signed-in visitor.
// Signed-out visitors get a short prompt to sign in and come straight back here afterwards. The data is fetched
// each time the page opens, because the download and receipt links are short-lived. The companion comes from
// the bot worker and loads on its own, so either worker can be down without blanking the other's part.
import { BIZ } from "../business.js";
import { $ } from "../util.js";
import { t } from "../i18n/index.js";
import { isSignedIn } from "../telegram/session.js";
import { rememberIntent } from "../checkout/intent.js";
import { companionBox, mountCompanion } from "../companion/view.js";
import { gateAttrs, signedOutCard, loginRequiredFor } from "./gate.js";
import { fetchAccount } from "./api.js";
import { librarySection } from "./library.js";
import { membershipsSection, membershipActions } from "./memberships.js";
import { invoicesSection } from "./invoices.js";

export const ACCOUNT_ROUTE = "account";
const COMPANION_MODE = "brief";

// An expired session: forget it and come back here after the new sign-in. Dropping it redraws the page.
const handleLoginRequired = loginRequiredFor(ACCOUNT_ROUTE);

const signedInBody = () => `<div id="meStatus" role="status" aria-live="polite" aria-busy="true"><p class="muted">${t("acct.loading")}</p></div>
    <div id="meLibrary" class="me-body"></div>${companionBox(COMPANION_MODE)}<div id="meRest" class="me-body"></div>`;

export function viewAccount() {
  return `<div class="wrap page-head"><h1>${t("acct.title")}</h1><p class="muted" style="margin-top:10px;max-width:56ch">${t("acct.lead")}</p></div>
  <div class="wrap me-page" ${gateAttrs()}>${isSignedIn() ? signedInBody() : signedOutCard(ACCOUNT_ROUTE)}</div>`;
}

function showError(status) {
  status.innerHTML = `<p>${t("acct.error", { email: `<b>${BIZ.email}</b>` })}</p><button class="btn btn-ghost btn-sm" type="button" data-act="account-retry" style="margin-top:10px">${t("acct.retry")}</button>`;
}

/** Fetch the account and fill the library, memberships and receipts. */
async function mountStore() {
  const status = $("#meStatus");
  if (!status) return;
  status.setAttribute("aria-busy", "true");
  status.innerHTML = `<p class="muted">${t("acct.loading")}</p>`;
  try {
    const data = await fetchAccount();
    if (!status.isConnected) return;
    $("#meLibrary").innerHTML = librarySection(data.library);
    $("#meRest").innerHTML = membershipsSection(data.memberships) + invoicesSection(data.invoices);
    status.innerHTML = "";
  } catch (error) {
    if (!status.isConnected || handleLoginRequired(error)) return;
    console.error("account: could not load", error);
    showError(status);
  } finally {
    status.setAttribute("aria-busy", "false");
  }
}

/** Called after the page is on screen: both parts load side by side. */
export function mountAccount() {
  if (!$("#meStatus")) return;
  mountStore();
  mountCompanion();
}

/** Click actions for main.js's ACTIONS. */
export const ACCOUNT_ACTIONS = {
  ...membershipActions(handleLoginRequired),
  "account-retry": () => mountStore(),
  // Any «sign in» button that should bring the visitor back to its page afterwards (data-to).
  "login-return": (el) => { rememberIntent({ route: el.dataset.to }); location.hash = "login"; },
};
