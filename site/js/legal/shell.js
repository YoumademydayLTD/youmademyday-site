// Shared layout for the policy pages: title, last-updated date, side contents and sections.
import { esc } from "../util.js";
import { LEGAL_UPDATED } from "../business.js";

export function legalShell({ title, lead, sections, extraTop = "" }) {
  return `<div class="wrap page-head"><h1>${title}</h1><p class="muted" style="margin:6px 0 0;max-width:60ch">${lead}</p>
    <div class="legal-meta"><span class="tag">עודכן לאחרונה: ${LEGAL_UPDATED}</span></div></div>
  <div class="wrap legal">
    <nav class="legal-toc" aria-label="תוכן העמוד"><h4>בעמוד הזה</h4>${sections.map((s) => `<button data-act="jump" data-to="${s.id}">${esc(s.h)}</button>`).join("")}</nav>
    <article>${extraTop}${sections.map((s) => `<section id="${s.id}"><h2>${esc(s.h)}</h2>${s.b}</section>`).join("")}</article>
  </div>`;
}
