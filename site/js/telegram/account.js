// The header's account spot: «log in» for visitors; once signed in, the user's name (a link to the personal
// area, #account) and a sign-out button.
// It redraws itself on every session change, so the rest of the header (search text, badges) stays as it is.
import { t } from "../i18n/index.js";
import { esc } from "../util.js";
import { isSignedIn, getUser, SESSION_EVENT } from "./session.js";

export const ACCOUNT_SLOT_ID = "acctSlot";
const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

function signedIn() {
  const name = getUser()?.name;
  const label = name ? t("nav.accountLabel", { name: esc(name) }) : t("nav.account");
  return `<a class="btn btn-tg tg-login" href="#account" aria-label="${label}">${icon("i-plane")}<span class="tg-name">${name ? esc(name) : t("nav.account")}</span></a>
    <button class="icon-btn" type="button" data-act="logout" aria-label="${t("nav.logout")}" title="${t("nav.logout")}">${icon("i-out")}</button>`;
}

const visitor = () => `<a class="btn btn-tg tg-login" href="#login" aria-label="${t("nav.loginLabel")}">${icon("i-plane")}<span>${t("nav.login")}</span></a>`;

/** Markup of the whole account spot, for the first render of the header. */
export const accountSlot = () => `<div class="acct-slot" id="${ACCOUNT_SLOT_ID}">${isSignedIn() ? signedIn() : visitor()}</div>`;

/** Keeps the account spot in step with the session. Call once, after the header is on the page. */
export function watchAccount() {
  window.addEventListener(SESSION_EVENT, () => {
    const slot = document.getElementById(ACCOUNT_SLOT_ID);
    if (slot) slot.innerHTML = isSignedIn() ? signedIn() : visitor();
  });
}
