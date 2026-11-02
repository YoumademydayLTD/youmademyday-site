// The five policy pages, in the active language. Text lives in i18n/<lang>/legal.js.
import { legalShell } from "./shell.js";
import { legalFor, t, L } from "../i18n/index.js";
import { LANG } from "../i18n/index.js";
import { legalParams } from "../business.js";
import { esc } from "../util.js";

const content = () => legalFor(legalParams(LANG));

function page(key, extraTop = "") {
  const c = content();
  const note = L.showVat ? "" : t("legal.governs");
  return legalShell({ ...c[key], updated: c.updated, extraTop: (note ? `<p class="note">${note}</p>` : "") + extraTop });
}

/** Copy-paste cancellation email (there is no server-side form yet). */
export const cancelText = () => content().refunds.cancelText;

function cancelBox() {
  const r = content().refunds;
  return `<div class="panel" id="cancelForm"><h2>${esc(t("foot.cancel"))}</h2>
  <p style="margin:0 0 12px">${r.cancelIntro}</p>
  <textarea id="cancelText" readonly rows="6" aria-label="${esc(t("foot.cancel"))}" style="width:100%;font:inherit;padding:14px;border-radius:14px;border:0;background:#fff;color:var(--ink)">${esc(r.cancelText)}</textarea>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn btn-ink btn-sm" data-act="copy-cancel">${t("legal.copyText")}</button><button class="btn btn-ghost btn-sm" style="background:#fff" data-act="copy-email">${t("legal.copyEmail")}</button></div>
</div>`;
}

export const viewTerms = () => page("terms");
export const viewPrivacy = () => page("privacy");
export const viewRefunds = () => page("refunds", cancelBox());
export const viewCookies = () => page("cookies");
export const viewAccessibility = () => page("accessibility");
