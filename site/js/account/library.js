// «My library» in the personal area: everything the visitor owns or has through a membership, with its cover,
// «read» on the site for readable items (or «continue» where they stopped), the progress, and a real download
// link. The links are short-lived and signed by the worker, so the page asks for fresh ones each time it opens.
import { ALL } from "../catalog.js";
import { flatCover } from "../book3d.js";
import { esc } from "../util.js";
import { t } from "../i18n/index.js";
import { readHref } from "../reader/route.js";
import { lastUnitOf } from "../reader/last-read.js";

// A file whose product is not in this language's catalogue still gets a tile, so the rows line up.
const coverOf = (item) => (ALL[item.id] ? flatCover(ALL[item.id]) : `<div class="plan-chip" aria-hidden="true">${esc(String(item.title).slice(0, 1))}</div>`);

const hasProgress = (p) => Number.isInteger(p?.done) && Number.isInteger(p?.total) && p.total > 0;

function readLink(item, title) {
  if (item.readable !== true) return "";
  const last = lastUnitOf(item.id);
  const [label, aria] = last === null ? ["acct.read", "acct.readLabel"] : ["acct.continue", "acct.continueLabel"];
  return `<a class="btn btn-ink btn-sm" href="${readHref(item.id, last)}" aria-label="${t(aria, { title })}">${t(label)}</a>`;
}

function downloadLink(item, title) {
  if (typeof item.url !== "string" || !item.url) return "";
  const tone = item.readable === true ? "btn-ghost" : "btn-ink";
  return `<a class="btn ${tone} btn-sm" href="${esc(item.url)}" download="${esc(item.filename ?? "")}" aria-label="${t("dl.downloadLabel", { title })}">${t("dl.download")}</a>`;
}

function details(item) {
  const kind = item.kind === "course" ? t("read.kind.course") : "PDF";
  const progress = hasProgress(item.progress) ? ` · ${t("acct.progress", { done: item.progress.done, total: item.progress.total })}` : "";
  const plan = item.viaPlan === true ? `<span class="tag tag-plan">${t("acct.viaPlan")}</span>` : "";
  return `<small>${kind}${progress}</small>${plan}`;
}

function fileLine(item) {
  const title = esc(item.title);
  return `<li class="line me-file">${coverOf(item)}<div class="me-file-info"><h4>${title}</h4>${details(item)}</div>
    <div class="me-file-acts">${readLink(item, title)}${downloadLink(item, title)}</div></li>`;
}

export function librarySection(items) {
  const body = items.length
    ? `<ul class="me-list">${items.map(fileLine).join("")}</ul><p class="fine">${t("acct.libraryNote")}</p>`
    : `<p class="muted">${t("acct.libraryEmpty")}</p><a class="lnk" href="#books"><span>${t("home.toShelf")}</span></a>`;
  return `<section class="panel me-sec" aria-labelledby="meLibH"><h2 id="meLibH">${t("acct.libraryH")}</h2>${body}</section>`;
}
