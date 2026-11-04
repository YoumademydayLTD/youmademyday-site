// The page the payment provider sends the buyer back to after paying (#thanks-<checkout id>): a thank-you,
// then the order's files to download, which appear as soon as the payment is confirmed. The same files are
// sent to the Telegram bot and stay in the personal area (#account), where the receipt is too.
import { BIZ } from "../business.js";
import { ALL } from "../catalog.js";
import { flatCover } from "../book3d.js";
import { esc, $ } from "../util.js";
import { t, HOME_URL } from "../i18n/index.js";
import { completePayment } from "../checkout/pay.js";
import { waitForDownloads } from "../checkout/downloads.js";
import { tgButton } from "./telegram.js";

const email = () => `<b>${BIZ.email}</b>`;

export function viewThanks(checkoutId) {
  completePayment();
  return `<div class="wrap success">
    <h1>${t("thanks.title")}</h1>
    <p class="muted">${t("thanks.text")}</p>
    <section class="panel downloads" aria-labelledby="dlTitle" style="width:min(640px,100%);text-align:start;display:flex;flex-direction:column;gap:12px">
      <h2 id="dlTitle" style="margin:0;font-size:22px">${t("dl.title")}</h2>
      <div id="dlStatus" role="status" aria-live="polite" aria-busy="true"><p class="muted">${t("dl.preparing")}</p></div>
      <div id="dlList" style="display:flex;flex-direction:column;gap:10px"></div>
    </section>
    ${tgButton(t("thanks.tgBtn"), `order-${checkoutId}`)}
    <a class="lnk" href="#account"><span>${t("thanks.toAccount")}</span></a>
    <small class="muted num">${t("thanks.ref", { id: esc(checkoutId) })}</small>
    <a class="btn btn-ghost" href="${HOME_URL}" data-home>${t("thanks.back")}</a>
  </div>`;
}

function itemLine(item) {
  const product = ALL[item.id];
  const label = t("dl.downloadLabel", { title: esc(item.title) });
  return `<div class="line">${product ? flatCover(product) : ""}<div style="min-width:0"><h4>${esc(item.title)}</h4><small>PDF</small></div>
    <a class="btn btn-ink btn-sm" href="${esc(item.url)}" download="${esc(item.filename)}" aria-label="${label}">${t("dl.download")}</a></div>`;
}

const MESSAGES = { late: () => t("dl.late", { email: email() }), refunded: () => t("dl.refunded"), none: () => t("dl.none", { email: email() }) };

function showResult(result) {
  const status = $("#dlStatus");
  status.setAttribute("aria-busy", "false");
  const isEmpty = result.status === "ready" && !result.items.length;
  if (result.status !== "ready" || isEmpty) {
    status.innerHTML = `<p>${MESSAGES[isEmpty ? "none" : result.status]()}</p>`;
    return;
  }
  $("#dlList").innerHTML = result.items.map(itemLine).join("");
  status.innerHTML = `<p class="muted">${t("dl.note")}</p>`;
}

/** Called after the thanks page is on screen: wait for the confirmed payment, then list the files. */
export async function showDownloads(checkoutId) {
  const root = $("#dlStatus");
  const result = await waitForDownloads(checkoutId, () => root.isConnected);
  if (root.isConnected) showResult(result);
}
