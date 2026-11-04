// The left panel and the button of a checkout page, live or "opens soon", shared by the cart and #buy- pages.
import { BIZ } from "../business.js";
import { t } from "../i18n/index.js";
import { isCheckoutLive } from "./config.js";

/** points: the list of reassurance lines under the text. */
export function payPanel(kind, points) {
  const live = isCheckoutLive(kind);
  const text = live ? `<p>${t("pay.text")}</p>` : `<p>${t("checkout.soon1")}</p><p>${t("checkout.soon2", { email: `<b>${BIZ.email}</b>` })}</p>`;
  return `<div class="panel" style="display:flex;flex-direction:column;gap:12px">
      <h2 style="margin:0">${t(live ? "pay.title" : "checkout.soonTitle")}</h2>
      ${text}
      <ul class="incl">${points.map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>`;
}

/** id: the product or plan id for single-item checkouts; omitted for the cart. */
export function payButton(kind, id = "") {
  if (!isCheckoutLive(kind)) return `<button class="btn btn-ink btn-block" disabled aria-disabled="true">${t("checkout.soonBtn")}</button>`;
  return `<button class="btn btn-ink btn-block" data-act="pay" data-kind="${kind}" data-id="${id}">${t("pay.btn")}</button>`;
}
