// One lesson or chapter (#read-<id>-<n>): its title and minutes, the body (HTML the worker already sanitized,
// worksheet included), a «done» toggle and the way to the previous and next unit.
// The toggle is optimistic: it flips at once and goes back, with a toast, when the worker does not save it.
import { BIZ } from "../business.js";
import { esc, toast, $ } from "../util.js";
import { t } from "../i18n/index.js";
import { readHref } from "./route.js";
import { saveUnitDone } from "./api.js";
import { unitName, unitTitle, progressText, crumbs } from "./labels.js";

const DONE_ID = "readDone";

// The unit on screen: the one copy the toggle reads and changes.
let shown = null;

function kicker(unit) {
  const position = t(`read.unitOf.${unit.kind}`, { n: unit.n, total: unit.total });
  return unit.minutes ? `${position} · ${t("read.minutes", { n: unit.minutes })}` : position;
}

function pagerLink(unit, ref, dir) {
  if (!ref) return "<span></span>";
  return `<a class="read-pager-link" href="${readHref(unit.id, ref.n)}" rel="${dir}">
      <small>${t(`read.${dir}`)}</small><span>${unitTitle(unit.kind, ref)}</span></a>`;
}

const doneBox = (unit) => `<div class="read-done" id="${DONE_ID}">
    <button class="btn btn-sm read-done-btn" type="button" data-act="read-done" aria-pressed="${unit.done}">
      <span class="read-check" aria-hidden="true"></span><span>${t("read.markDone")}</span></button>
    <span class="read-count muted" aria-live="polite">${progressText(unit.kind, unit.doneCount, unit.total)}</span></div>`;

/** Markup of the unit page. */
export function unitPage(unit) {
  shown = unit;
  const listLink = `<a href="${readHref(unit.id)}">${t(`read.list.${unit.kind}`)}</a>`;
  return `${crumbs(listLink)}
    <article class="reader" aria-labelledby="readTitle">
      <header class="read-head"><p class="read-kicker">${kicker(unit)}</p><h1 id="readTitle" tabindex="-1">${esc(unit.title) || unitName(unit.kind, unit.n)}</h1></header>
      <div class="read-text">${unit.html}</div>
    </article>
    ${doneBox(unit)}
    <nav class="read-pager" aria-label="${t(`read.list.${unit.kind}`)}">${pagerLink(unit, unit.prev, "prev")}${pagerLink(unit, unit.next, "next")}</nav>`;
}

/** After the body is on screen: wide tables scroll inside their own box, never the whole page. */
export function fitBody(root) {
  root.querySelectorAll(".read-text table").forEach((table) => {
    if (table.parentElement.classList.contains("read-table")) return;
    const box = document.createElement("div");
    box.className = "read-table";
    box.tabIndex = 0; // a box that scrolls must be reachable by keyboard
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", t("read.tableLabel"));
    table.replaceWith(box);
    box.append(table);
  });
}

// Updated in place, so the button keeps focus while the state changes.
function syncDone(unit) {
  const box = document.getElementById(DONE_ID);
  if (!box) return;
  box.querySelector("button").setAttribute("aria-pressed", String(unit.done));
  box.querySelector(".read-count").textContent = progressText(unit.kind, unit.doneCount, unit.total);
}

/** The «done» toggle. onLoginRequired(error) handles an expired session and returns true when it did. */
async function toggleDone(el, onLoginRequired) {
  const unit = shown;
  if (!unit || el.getAttribute("aria-busy") === "true") return;
  const before = { done: unit.done, doneCount: unit.doneCount, total: unit.total };
  const wanted = !unit.done;
  Object.assign(unit, { done: wanted, doneCount: Math.max(0, unit.doneCount + (wanted ? 1 : -1)) });
  syncDone(unit);
  el.setAttribute("aria-busy", "true");
  try {
    Object.assign(unit, await saveUnitDone(unit.id, unit.n, wanted));
  } catch (error) {
    if (onLoginRequired(error)) return;
    console.error("reader: could not save the done tick", error);
    Object.assign(unit, before);
    toast(t("read.doneError", { email: BIZ.email }));
  } finally {
    el.removeAttribute("aria-busy");
    if (shown === unit && $(`#${DONE_ID}`)) syncDone(unit);
  }
}

/** Click actions for main.js's ACTIONS. */
export const unitActions = (onLoginRequired) => ({
  "read-done": (el) => toggleDone(el, onLoginRequired),
});
