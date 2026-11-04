// «My memberships» in the personal area: each plan's state, the next charge, and cancelling in place.
// Cancelling asks first, on the card itself, and says what happens (owner, 04.11.2026): on the free first day
// it ends at once with no charge; after that it stays until the paid period ends and never renews.
import { BIZ } from "../business.js";
import { esc } from "../util.js";
import { t, L } from "../i18n/index.js";
import { formatMoney } from "../money.js";
import { cancelMembership } from "./api.js";
import { formatDate, isTrialMembership, membershipState, moneyOf } from "./status.js";

// A plan's own full title wins over the "membership of {name}" template (owner 04.11: the Maximum is «המקסימום»).
function planTitle(id, name) {
  const own = t(`plan.${id}.title`);
  return own && own !== `plan.${id}.title` ? own : t("buy.planTitle", { name });
}


// The memberships on screen, by id: the one copy the cancel buttons read and the cancel reply replaces.
const shown = new Map();

const planName = (planId) => {
  const key = `plan.${planId}.name`;
  const name = t(key);
  return name === key ? esc(planId) : name;
};

function nextChargeLine(m, state) {
  const money = moneyOf(m.amount, m.currency);
  const date = formatDate(state.date, L.locale);
  if (!state.hasNextCharge || !money || !date) return "";
  return `<p class="muted">${t("acct.nextCharge", { date, amount: formatMoney(money.amount, money.currency) })}</p>`;
}

function stateTag(state) {
  const label = t(`acct.status.${state.key}`, { date: formatDate(state.date, L.locale) });
  const isGood = state.key === "active" || state.key === "trial";
  return `<span class="tag${isGood ? " tag-ok" : ""}">${label}</span>`;
}

function cardInner(m, notice = "") {
  const state = membershipState(m);
  const name = planName(m.planId);
  const cancel = m.canCancel
    ? `<button class="btn btn-ghost btn-sm" type="button" data-act="cancel-ask" data-id="${esc(m.id)}" aria-label="${t("acct.cancelLabel", { name })}">${t("acct.cancel")}</button>`
    : "";
  return `<div class="me-head"><h3 tabindex="-1">${planTitle(m.planId, name)}</h3>${stateTag(state)}</div>
    ${nextChargeLine(m, state)}
    <div class="me-actions">${cancel}</div>
    <p class="login-status" role="status" aria-live="polite">${notice}</p>`;
}

const cardOf = (id) => document.querySelector(`.me-card[data-id="${CSS.escape(id)}"]`);

export function membershipsSection(memberships) {
  shown.clear();
  memberships.forEach((m) => shown.set(m.id, m));
  const body = memberships.length
    ? `<ul class="me-list">${memberships.map((m) => `<li class="me-card" data-id="${esc(m.id)}">${cardInner(m)}</li>`).join("")}</ul>`
    : `<p class="muted">${t("acct.membershipsEmpty")}</p><a class="lnk" href="#plans"><span>${t("home.allPlans")}</span></a>`;
  return `<section class="panel me-sec" aria-labelledby="meMemH"><h2 id="meMemH">${t("acct.membershipsH")}</h2>${body}</section>`;
}

function confirmText(m) {
  if (isTrialMembership(m)) return t("acct.cancelAskTrial");
  return t("acct.cancelAskPaid", { date: formatDate(m.currentPeriodEnd, L.locale) });
}

/** The cancel button: show the question and both answers on the card. */
function askCancel(el) {
  const m = shown.get(el.dataset.id);
  if (!m) return;
  const id = esc(m.id);
  el.closest(".me-actions").innerHTML = `<div class="me-confirm" role="group" aria-labelledby="meAsk-${id}">
      <p id="meAsk-${id}">${confirmText(m)}</p>
      <div class="ctas-row"><button class="btn btn-ink btn-sm" type="button" data-act="cancel-confirm" data-id="${id}">${t("acct.cancelYes")}</button>
      <button class="btn btn-ghost btn-sm" type="button" data-act="cancel-keep" data-id="${id}">${t("acct.cancelNo")}</button></div>
    </div>`;
  cardOf(m.id)?.querySelector('[data-act="cancel-confirm"]')?.focus();
}

/** «Keep it»: put the card back as it was, with focus on its cancel button. */
function keepMembership(el) {
  const m = shown.get(el.dataset.id);
  const card = m && cardOf(m.id);
  if (!card) return;
  card.innerHTML = cardInner(m);
  card.querySelector('[data-act="cancel-ask"]')?.focus();
}

// Said from the worker's answer, not from what was asked: it decides whether the end is now or later.
const doneNotice = (m) => (membershipState(m).key === "ending"
  ? t("acct.canceledPaid", { date: formatDate(m.currentPeriodEnd, L.locale) })
  : t("acct.canceledNow"));

/** «Yes, cancel»: ask the worker, then redraw the card from its answer and say what changed. */
async function confirmCancel(el, onLoginRequired) {
  const before = shown.get(el.dataset.id);
  if (!before || el.disabled) return;
  el.disabled = true;
  el.setAttribute("aria-busy", "true");
  el.textContent = t("acct.canceling");
  try {
    const after = await cancelMembership(before.id);
    shown.set(after.id, after);
    const card = cardOf(after.id);
    if (!card) return;
    card.innerHTML = cardInner(after, doneNotice(after));
    card.querySelector("h3").focus();
  } catch (error) {
    if (onLoginRequired(error)) return;
    console.error("account: cancel failed", error);
    const card = cardOf(before.id);
    if (card) card.innerHTML = cardInner(before, t("acct.cancelError", { email: `<b>${BIZ.email}</b>` }));
    card?.querySelector('[data-act="cancel-ask"]')?.focus();
  }
}

/**
 * Click actions for main.js's ACTIONS. onLoginRequired(error) handles an expired session and returns
 * true when it did, so the card does not also show an error.
 */
export const membershipActions = (onLoginRequired) => ({
  "cancel-ask": askCancel,
  "cancel-keep": keepMembership,
  "cancel-confirm": (el) => confirmCancel(el, onLoginRequired),
});
