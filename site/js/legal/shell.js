// Shared layout for the policy pages: title, last-updated date, side contents and sections.
import { esc } from "../util.js";
import { t } from "../i18n/index.js";

export function legalShell({ title, lead, sections, updated, extraTop = "" }) {
  return `<div class="wrap page-head"><h1>${title}</h1><p class="muted" style="margin:10px 0 0;max-width:60ch">${lead}</p>
    <div class="legal-meta"><span class="tag">${t("legal.updated", { date: updated })}</span></div></div>
  <div class="wrap legal">
    <nav class="legal-toc" aria-label="${t("legal.onPage")}"><h4>${t("legal.onPage")}</h4>${sections.map((s) => `<button data-act="jump" data-to="${s.id}">${esc(s.h)}</button>`).join("")}</nav>
    <article>${extraTop}${sections.map((s) => `<section id="${s.id}"><h2>${esc(s.h)}</h2>${s.b}</section>`).join("")}</article>
  </div>`;
}
