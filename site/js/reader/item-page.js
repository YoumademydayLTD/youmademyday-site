// The list page of one item (#read-<id>): its title, progress, a «start» or «continue» button and every
// lesson (with minutes) or chapter, each with its done tick.
import { esc } from "../util.js";
import { t } from "../i18n/index.js";
import { readHref } from "./route.js";
import { nextUnitToOpen } from "./reply.js";
import { unitName, unitTitle, progressLine, crumbs } from "./labels.js";

function unitRow(item, unit) {
  const minutes = unit.minutes ? `<em>${t("read.minutes", { n: unit.minutes })}</em>` : "";
  const done = unit.done ? `<span class="sr-only">${t("read.doneTick")}</span>` : "";
  return `<li class="read-unit${unit.done ? " is-done" : ""}"><a href="${readHref(item.id, unit.n)}">
      <span class="read-tick" aria-hidden="true">${unit.done ? "✓" : unit.n}</span>
      <span class="read-unit-title">${unitTitle(item.kind, unit)}${done}</span>${minutes}</a></li>`;
}

function openButton(item, lastN) {
  const n = nextUnitToOpen(item.units, lastN);
  if (n === null) return "";
  const isStarted = item.done > 0 || lastN !== null;
  const label = isStarted ? t("read.continueTo", { unit: unitName(item.kind, n) }) : t("read.start");
  return `<a class="btn btn-ink" href="${readHref(item.id, n)}">${label}</a>`;
}

/** Markup of the list page; lastN is the unit last open in this browser, or null. */
export function itemPage(item, lastN) {
  const list = item.units.length
    ? `<ol class="read-units" aria-label="${t(`read.list.${item.kind}`)}">${item.units.map((u) => unitRow(item, u)).join("")}</ol>`
    : `<p class="muted">${t("read.noUnits")}</p>`;
  return `${crumbs()}
    <header class="read-head"><p class="read-kicker">${t(`read.kind.${item.kind}`)}</p>
      <h1 tabindex="-1">${esc(item.title)}</h1>${progressLine(item.kind, item.done, item.total)}</header>
    <div class="read-open">${openButton(item, lastN)}</div>
    ${list}`;
}
