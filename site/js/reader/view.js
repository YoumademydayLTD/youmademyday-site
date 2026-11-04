// The reader (#read-<id> and #read-<id>-<n>): courses, books and templates read on the site itself, so a buyer
// who never opened the Telegram bot still gets everything. Only for the signed-in visitor; what they may open is
// the worker's call (bought, or included in a membership). Fetched each time, so the done ticks stay current.
import { BIZ } from "../business.js";
import { ALL } from "../catalog.js";
import { $ } from "../util.js";
import { t } from "../i18n/index.js";
import { isSignedIn } from "../telegram/session.js";
import { gateAttrs, signedOutCard, loginRequiredFor } from "../account/gate.js";
import { READ_PREFIX, parseReadRoute } from "./route.js";
import { fetchReadItem, fetchReadUnit } from "./api.js";
import { lastUnitOf, rememberUnit } from "./last-read.js";
import { itemPage } from "./item-page.js";
import { unitPage, fitBody, unitActions } from "./unit-page.js";

export { READ_PREFIX };
const STATUS_ID = "readStatus";

// The part after the prefix of the page on screen, for «try again» and for coming back after a new sign-in.
let mountedRest = "";
const onLoginRequired = (error) => loginRequiredFor(READ_PREFIX + mountedRest)(error);

/** Markup of the page shell; the content arrives in mountRead(). */
export function viewRead(rest) {
  if (!isSignedIn()) return `<div class="wrap page-head" ${gateAttrs()}>${signedOutCard(READ_PREFIX + rest)}</div>`;
  return `<div class="wrap read-page" ${gateAttrs()}>
    <div id="${STATUS_ID}" role="status" aria-live="polite" aria-busy="true"><p class="muted">${t("read.loading")}</p></div>
    <div id="readBody"></div></div>`;
}

const notFound = () => `<p>${t("read.notFound")}</p><a class="lnk" href="#account"><span>${t("acct.libraryH")}</span></a>`;

function problemOf(error, id) {
  if (error?.code === "not_found") return notFound();
  if (error?.code === "not_entitled") {
    const toItem = ALL[id] ? `<a class="lnk" href="#${id}"><span>${t("read.toItem")}</span></a>` : "";
    return `<p>${t("read.notEntitled")}</p>${toItem}`;
  }
  return `<p>${t("read.error", { email: `<b>${BIZ.email}</b>` })}</p>
    <button class="btn btn-ghost btn-sm" type="button" data-act="read-retry" style="margin-top:10px">${t("acct.retry")}</button>`;
}

async function contentOf({ id, n }) {
  if (n === null) {
    const item = await fetchReadItem(id);
    return { html: itemPage(item, lastUnitOf(id)), title: item.title };
  }
  const unit = await fetchReadUnit(id, n);
  rememberUnit(id, n);
  return { html: unitPage(unit), title: unit.title };
}

// A new page: the title takes focus (screen readers start there) and names the browser tab.
function showContent(content) {
  const body = $("#readBody");
  body.innerHTML = content.html;
  fitBody(body);
  if (content.title) document.title = t("meta.itemTitle", { title: content.title });
  body.querySelector("h1")?.focus({ preventScroll: true });
}

/** Called after the page is on screen: fetch the list or the unit and draw it. */
export async function mountRead(rest) {
  const status = document.getElementById(STATUS_ID);
  if (!status) return;
  mountedRest = rest;
  const target = parseReadRoute(rest);
  status.setAttribute("aria-busy", "true");
  status.innerHTML = `<p class="muted">${t("read.loading")}</p>`;
  try {
    if (!target) { status.innerHTML = notFound(); return; }
    const content = await contentOf(target);
    // A quick click on «next» may have drawn another page meanwhile: this answer is then for nobody.
    if (!status.isConnected) return;
    status.innerHTML = "";
    showContent(content);
  } catch (error) {
    if (!status.isConnected || onLoginRequired(error)) return;
    console.error("reader: could not load", error);
    status.innerHTML = problemOf(error, target.id);
  } finally {
    status.setAttribute("aria-busy", "false");
  }
}

/** Click actions for main.js's ACTIONS. */
export const READ_ACTIONS = {
  ...unitActions(onLoginRequired),
  "read-retry": () => mountRead(mountedRest),
};
