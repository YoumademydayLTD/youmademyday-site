// The page the payment provider sends the buyer back to after paying (#thanks-<checkout id>).
import { BIZ } from "../business.js";
import { esc } from "../util.js";
import { t, HOME_URL } from "../i18n/index.js";
import { completePayment } from "../checkout/pay.js";

export function viewThanks(checkoutId) {
  completePayment();
  return `<div class="wrap success">
    <h1>${t("thanks.title")}</h1>
    <p class="muted">${t("thanks.text", { email: `<b>${BIZ.email}</b>` })}</p>
    <small class="muted num">${t("thanks.ref", { id: esc(checkoutId) })}</small>
    <a class="btn btn-ink" href="${HOME_URL}" data-home>${t("thanks.back")}</a>
  </div>`;
}
