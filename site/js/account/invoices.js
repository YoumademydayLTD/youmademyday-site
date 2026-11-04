// «My receipts» in the personal area: one row per order with its date, items, total, status and the
// receipt or invoice to download. The payment provider no longer emails them, so this is where they live.
import { esc } from "../util.js";
import { t, L } from "../i18n/index.js";
import { formatMoney } from "../money.js";
import { formatDate, moneyOf } from "./status.js";

const ORDER_STATUSES = new Set(["paid", "refunded", "partially_refunded"]);

const statusLabel = (status) => (ORDER_STATUSES.has(status) ? t(`acct.inv.${status}`) : esc(status ?? ""));

function totalOf(invoice) {
  const money = moneyOf(invoice.total, invoice.currency);
  return money ? formatMoney(money.amount, money.currency) : "";
}

function invoiceRow(invoice) {
  const date = formatDate(invoice.createdAt, L.locale);
  const items = (Array.isArray(invoice.items) ? invoice.items : []).map((i) => esc(i.title)).join(", ");
  const link = typeof invoice.url === "string" && invoice.url
    ? `<a class="lnk" href="${esc(invoice.url)}" target="_blank" rel="noopener" aria-label="${t("acct.invLabel", { date })}"><span>${t("acct.invDownload")}</span></a>`
    : `<span class="muted">${t("acct.invPending")}</span>`;
  return `<tr><td class="num">${date}</td><td>${items}</td><td class="num">${totalOf(invoice)}</td><td>${statusLabel(invoice.status)}</td><td>${link}</td></tr>`;
}

export function invoicesSection(invoices) {
  const body = invoices.length
    ? `<div class="tbl-wrap me-tbl"><table class="tbl" aria-labelledby="meInvH">
        <thead><tr><th scope="col">${t("acct.thDate")}</th><th scope="col">${t("acct.thItems")}</th><th scope="col" class="num">${t("acct.thTotal")}</th><th scope="col">${t("acct.thStatus")}</th><th scope="col">${t("acct.thDoc")}</th></tr></thead>
        <tbody>${invoices.map(invoiceRow).join("")}</tbody></table></div>`
    : `<p class="muted">${t("acct.invoicesEmpty")}</p>`;
  return `<section class="panel me-sec" aria-labelledby="meInvH"><h2 id="meInvH">${t("acct.invoicesH")}</h2>${body}</section>`;
}
