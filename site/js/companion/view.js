// «My daily companion»: the bot's daily track on the site, for a buyer who never opens Telegram. The personal
// area shows a short box (today, «done», the streak); its own page (#companion) adds past days and settings,
// or the tracks to join. The data comes from the bot worker and loads on its own, so when one worker is down
// the rest of the personal area still works.
import { BIZ } from "../business.js";
import { t } from "../i18n/index.js";
import { isSignedIn } from "../telegram/session.js";
import { gateAttrs, signedOutCard, loginRequiredFor } from "../account/gate.js";
import { fetchCompanion, markCompanionDone, joinCompanionTrack } from "./api.js";
import { todayBlock, todayInner, trackName, TODAY_ID } from "./today.js";
import { historyBlock } from "./history.js";
import { joinBlock } from "./join.js";
import { settingsBlock, saveSetting, SETTING_CHANGES } from "./settings.js";

export const COMPANION_ROUTE = "companion";
const BRIEF = "brief";
const FULL = "full";
const FORBIDDEN = "forbidden";
const ROOT_ID = "compRoot";
const STATUS_ID = "compStatus";

// The companion on screen: the one copy every control reads and every reply replaces.
let shown = null;

const byId = (id) => document.getElementById(id);
const isBrief = () => byId(ROOT_ID)?.dataset.mode === BRIEF;
// An expired session comes back to the page it happened on.
const onLoginRequired = (error) => loginRequiredFor(isBrief() ? "account" : COMPANION_ROUTE)(error);
const say = (html) => { const el = byId(STATUS_ID); if (el) el.innerHTML = html; };

/** The box itself, empty until mountCompanion() fills it. In the personal area it carries its own heading. */
export function companionBox(mode) {
  const heading = mode === BRIEF ? `<h2 id="compH" tabindex="-1">${t("comp.title")}</h2>` : "";
  return `<section class="panel me-sec comp" id="${ROOT_ID}" data-mode="${mode}" aria-labelledby="${mode === BRIEF ? "compH" : "compPageH"}">${heading}
    <div id="${STATUS_ID}" class="comp-status" role="status" aria-live="polite" aria-busy="true"><p class="muted">${t("comp.loading")}</p></div>
    <div id="compBody" class="comp-body"></div></section>`;
}

/** The #companion page. */
export function viewCompanion() {
  const head = `<div class="wrap page-head"><h1 id="compPageH" tabindex="-1">${t("comp.title")}</h1><p class="muted" style="margin-top:10px;max-width:56ch">${t("comp.lead")}</p></div>`;
  return `${head}<div class="wrap me-page" ${gateAttrs()}>${isSignedIn() ? companionBox(FULL) : signedOutCard(COMPANION_ROUTE)}</div>`;
}

function bodyOf(data, brief) {
  if (!data.track) return joinBlock(data.tracks, brief);
  if (brief) return `${todayBlock(data)}<a class="lnk" href="#${COMPANION_ROUTE}"><span>${t("comp.more")}</span></a>`;
  return todayBlock(data) + historyBlock(data.history) + settingsBlock(data.settings);
}

const draw = () => { byId("compBody").innerHTML = bodyOf(shown, isBrief()); };

function showError() {
  say(`<p>${t("comp.error", { email: `<b>${BIZ.email}</b>` })}</p><button class="btn btn-ghost btn-sm" type="button" data-act="comp-retry" style="margin-top:10px">${t("acct.retry")}</button>`);
}

/** Called after the box is on screen: fetch the companion and draw it. */
export async function mountCompanion() {
  const status = byId(STATUS_ID);
  if (!status) return;
  status.setAttribute("aria-busy", "true");
  say(`<p class="muted">${t("comp.loading")}</p>`);
  try {
    const data = await fetchCompanion();
    if (!status.isConnected) return;
    shown = data;
    say("");
    draw();
  } catch (error) {
    if (!status.isConnected || onLoginRequired(error)) return;
    console.error("companion: could not load", error);
    showError();
  } finally {
    status.setAttribute("aria-busy", "false");
  }
}

// After «done» the box is redrawn, so focus goes to the day's heading and the status says the new streak.
async function markDone(el) {
  if (!shown || el.disabled) return;
  el.disabled = true;
  try {
    Object.assign(shown, await markCompanionDone());
    byId(TODAY_ID).innerHTML = todayInner(shown);
    byId("compDayH")?.focus();
    say(t("comp.doneSaid", { n: shown.streak }));
  } catch (error) {
    if (onLoginRequired(error)) return;
    console.error("companion: could not mark today done", error);
    el.disabled = false;
    say(t("comp.doneError", { email: `<b>${BIZ.email}</b>` }));
  }
}

async function join(el) {
  if (el.disabled) return;
  const track = el.dataset.track;
  el.disabled = true;
  try {
    shown = await joinCompanionTrack(track);
    draw();
    byId("compPageH")?.focus();
    say(t("comp.joined", { name: trackName(track) }));
  } catch (error) {
    if (onLoginRequired(error)) return;
    console.error("companion: could not join a track", error);
    el.disabled = false;
    say(error?.code === FORBIDDEN
      ? `${t("comp.needsPlan")} <a class="lnk" href="#plans"><span>${t("home.allPlans")}</span></a>`
      : t("comp.joinError", { email: `<b>${BIZ.email}</b>` }));
  }
}

// A pause changes what «today» says, so that box follows the saved settings.
function setSettings(settings) {
  shown.settings = settings;
  const today = byId(TODAY_ID);
  if (today) today.innerHTML = todayInner(shown);
}

const changeSetting = (el) => (shown ? saveSetting(el, { getSettings: () => shown.settings, setSettings, onLoginRequired }) : undefined);

/** Click actions for main.js's ACTIONS. */
export const COMPANION_ACTIONS = {
  "comp-done": markDone,
  "comp-join": join,
  "comp-retry": () => mountCompanion(),
};

/** Change actions (data-change on selects and switches) for main.js's change listener. */
export const COMPANION_CHANGES = Object.fromEntries(SETTING_CHANGES.map((name) => [name, changeSetting]));
