// The order details document as a printable HTML page (pure). The print stylesheet makes "save as PDF" clean.
import { DOC_COPY, LOCALES, RTL_LANGS, type DocCopy } from "./copy.ts";
import type { DocData } from "./data.ts";

const MINOR_UNITS = 100;
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
const fill = (text: string, vars: Record<string, string>): string => text.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? `{${k}}`);

function formatters(lang: string, currency: string) {
  const locale = LOCALES[lang] ?? "en-US";
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jerusalem" });
  return { money: (minor: number) => money.format(minor / MINOR_UNITS), date: (iso: string) => date.format(new Date(iso)) };
}

const STYLE = `body{font:15px/1.55 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#111;background:#fff;margin:0}
main{max-width:720px;margin:0 auto;padding:32px 20px}h1{font-size:26px;margin:0 0 4px}h2{font-size:17px;margin:28px 0 8px}
.muted{color:#555}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{padding:8px 4px;border-bottom:1px solid #ddd;text-align:start}
td.num,th.num{text-align:end;white-space:nowrap}tfoot td{font-weight:700;border-bottom:0}dl{display:grid;grid-template-columns:max-content 1fr;gap:4px 16px;margin:0}
dt{color:#555}dd{margin:0}button{margin-top:28px;padding:10px 18px;border-radius:999px;border:0;background:#111;color:#fff;font:inherit;cursor:pointer}
@media print{button{display:none}main{padding:0}a{color:inherit}}`;

function sellerBlock(data: DocData, c: DocCopy): string {
  const b = data.business;
  return `<h2>${c.seller}</h2><dl><dt>${c.company}</dt><dd>${escapeHtml(b.name)}</dd><dt>${c.companyNo}</dt><dd>${escapeHtml(b.id)}</dd>
    <dt>${c.address}</dt><dd>${escapeHtml(b.addr)}</dd><dt>${c.support}</dt><dd><a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a></dd></dl>`;
}

function itemsTable(data: DocData, c: DocCopy, money: (minor: number) => string): string {
  const rows = data.items.map((i) => `<tr><td>${escapeHtml(i.title)}</td><td class="num">${money(i.amount)}</td></tr>`).join("");
  const deal = data.deal ? `<tr><td>${c.deal}</td><td class="num">−${money(data.deal)}</td></tr>` : "";
  return `<table><thead><tr><th>${c.item}</th><th class="num">${c.price}</th></tr></thead><tbody>${rows}${deal}</tbody>
    <tfoot><tr><td>${c.total}</td><td class="num">${money(data.total)}</td></tr></tfoot></table>${c.vatIncluded ? `<p class="muted">${c.vatIncluded}</p>` : ""}`;
}

function planBlock(data: DocData, c: DocCopy, money: (minor: number) => string): string {
  if (!data.plan) return "";
  const period = data.plan.period === "week" ? c.periodWeek : c.periodMonth;
  const free = data.plan.trialDays ? `<p>${fill(c.freeDay, { days: String(data.plan.trialDays) })}</p>` : "";
  return `<h2>${c.membershipH}</h2><p><b>${escapeHtml(data.plan.title)}</b>: ${fill(c.pricePer, { price: money(data.plan.amount), period })}</p>${free}<p>${c.renewal}</p><p>${c.cancelHow}</p>`;
}

/** nonce: the per-response CSP nonce that lets the one inline script (the print button) run. */
export function renderOrderDoc(data: DocData, nonce: string): string {
  const c = DOC_COPY[data.lang] ?? DOC_COPY.en;
  if (!c) throw new Error("no document copy");
  const f = formatters(data.lang, data.currency);
  const delivery = [data.hasFiles ? c.deliveryFiles : "", data.plan ? c.deliveryMembership : ""].filter(Boolean).map((t) => `<p>${t}</p>`).join("");
  return `<!doctype html><html lang="${data.lang}" dir="${RTL_LANGS.has(data.lang) ? "rtl" : "ltr"}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${c.title} · ${escapeHtml(data.orderId)}</title><style>${STYLE}</style></head>
<body><main><h1>${c.title}</h1><p class="muted">${c.orderNo}: <span dir="ltr">${escapeHtml(data.orderId)}</span> · ${c.date}: ${f.date(data.date)}</p>
${data.status === "refunded" ? `<p><b>${c.refunded}</b></p>` : ""}
${sellerBlock(data, c)}<h2>${c.item}</h2>${itemsTable(data, c, f.money)}${planBlock(data, c, f.money)}
<h2>${c.deliveryH}</h2>${delivery}
<h2>${c.rightsH}</h2><p>${fill(c.rights, { days: String(data.refundDays) })} <a href="${escapeHtml(data.refundsUrl)}">${c.rightsLink}</a></p>
<button type="button" id="print">${c.print}</button></main><script nonce="${nonce}">document.getElementById("print").addEventListener("click",()=>print())</script></body></html>`;
}
