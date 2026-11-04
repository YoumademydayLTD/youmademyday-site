// «My library» in the personal area: every purchased file with its cover and a real download link.
// The links are short-lived and signed by the worker, so the page asks for fresh ones each time it opens.
import { ALL } from "../catalog.js";
import { flatCover } from "../book3d.js";
import { esc } from "../util.js";
import { t } from "../i18n/index.js";

// A file whose product is not in this language's catalogue still gets a tile, so the rows line up.
const coverOf = (item) => (ALL[item.id] ? flatCover(ALL[item.id]) : `<div class="plan-chip" aria-hidden="true">${esc(String(item.title).slice(0, 1))}</div>`);

function fileLine(item) {
  const title = esc(item.title);
  const download = typeof item.url === "string" && item.url
    ? `<a class="btn btn-ink btn-sm" href="${esc(item.url)}" download="${esc(item.filename ?? "")}" aria-label="${t("dl.downloadLabel", { title })}">${t("dl.download")}</a>`
    : "";
  return `<li class="line">${coverOf(item)}<div style="min-width:0"><h4>${title}</h4><small>PDF</small></div>${download}</li>`;
}

export function librarySection(items) {
  const body = items.length
    ? `<ul class="me-list">${items.map(fileLine).join("")}</ul><p class="fine">${t("acct.libraryNote")}</p>`
    : `<p class="muted">${t("acct.libraryEmpty")}</p><a class="lnk" href="#books"><span>${t("home.toShelf")}</span></a>`;
  return `<section class="panel me-sec" aria-labelledby="meLibH"><h2 id="meLibH">${t("acct.libraryH")}</h2>${body}</section>`;
}
