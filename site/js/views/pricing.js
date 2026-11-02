// Pricing page: every price in one place.
import { COURSES, BOOKS, ALL, kindShort } from "../catalog.js";
import { esc, ils } from "../util.js";
import { BOOK_DEAL_MIN, REFUND_DAYS } from "../business.js";
import { t, tList } from "../i18n/index.js";

const fill = (key, vars) => tList(key).map((s) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ""));
const rows = (list) => list.map((p) => `<tr><td><a href="#${p.id}">${esc(p.title)}</a></td><td>${kindShort(p)}</td><td>${esc(p.cat)}</td><td class="num"><b>${ils(p.price)}</b></td></tr>`).join("");
const table = (title, list) => `<h3 style="margin:22px 0 12px">${title}</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t("pricing.thName")}</th><th>${t("pricing.thKind")}</th><th>${t("pricing.thTopic")}</th><th class="num">${t("pricing.thPrice")}</th></tr></thead><tbody>${rows(list)}</tbody></table></div>`;
const plan = (title, big, items, href, cta) => `<div class="plan"><h3>${title}</h3><div class="big num">${big}</div><ul class="incl">${items.map((i) => `<li>${i}</li>`).join("")}</ul><a class="btn btn-ink btn-block" href="${href}">${cta}</a></div>`;

export function viewPricing() {
  const cheapest = (list) => Math.min(...list.map((p) => p.price));
  const bundles = BOOKS.filter((p) => p.type === "bundle");
  const singles = BOOKS.filter((p) => p.type !== "bundle");
  const bundleLines = bundles.map((b) => esc(t("pricing.bundleLine", { title: b.title, price: ils(b.price), was: ils(b.includes.reduce((s, id) => s + (ALL[id]?.price || 0), 0)) })));
  return `<div class="wrap page-head"><h1>${t("pricing.title")}</h1><p class="muted" style="margin:10px 0 0;max-width:60ch">${t("pricing.lead")}</p></div>
  <div class="wrap" style="display:flex;flex-direction:column;gap:48px;padding-bottom:48px">
    <div class="plans">
      ${plan(t("pricing.course"), `${cheapest(COURSES)}<small> ${t("pricing.from")}</small>`, fill("pricing.courseIncl", { days: REFUND_DAYS }), "#courses", t("pricing.toCourses"))}
      ${plan(t("pricing.book"), `${cheapest(singles)}<small> ${t("pricing.from")}</small>`, fill("pricing.bookIncl", { n: BOOK_DEAL_MIN }), "#books", t("pricing.toBooks"))}
      ${plan(t("pricing.bundles"), `${bundles.length}<small> ${t("pricing.bundlesN")}</small>`, bundleLines, "#books", t("pricing.toBundles"))}
    </div>
    <div><div class="sec-head"><h2 style="font-size:34px">${t("pricing.all")}</h2></div>${table(t("pricing.coursesH"), COURSES)}${table(t("pricing.booksH"), BOOKS)}</div>
    <div class="panel"><h2>${t("pricing.howTitle")}</h2><ul class="incl">${tList("pricing.how").map((x) => `<li>${x}</li>`).join("")}</ul></div>
  </div>`;
}
