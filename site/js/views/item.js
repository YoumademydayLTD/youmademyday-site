// Product page: course, e-book / template, or bundle.
import { ALL, COURSES, BOOKS, card, heart, isCourse, kindLabel, courseMinutes, hoursLabel } from "../catalog.js";
import { S } from "../state.js";
import { esc, ils } from "../util.js";
import { BRAND, REFUND_DAYS } from "../business.js";
import { bookStage } from "../book3d.js";
import { t, tList, HOME_URL } from "../i18n/index.js";
import { isDirectOffer, priceLabel, buyHref } from "../money.js";

const RELATED_COUNT = 4;
const heroBook = (p) => bookStage(p, { style: "--ry:-22deg" });
const fill = (key, vars) => tList(key).map((s) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ""));

function includedList(p) {
  if (isCourse(p)) return fill("incl.course", { n: p.lessons.length, h: hoursLabel(courseMinutes(p)), days: REFUND_DAYS });
  if (p.type === "bundle") return fill("incl.bundle", { n: p.includes.length });
  return fill("incl.book", { n: p.pages, mb: p.mb });
}

function buyBox(p) {
  const inCart = S.cart.includes(p.id);
  const saved = S.wish.includes(p.id);
  const vat = t("item.inclVat");
  const buttons = isDirectOffer(p)
    ? `<a class="btn btn-tg btn-block" href="${buyHref(p.id)}">${t("item.buyFor", { price: priceLabel(p) })}</a>`
    : `<button class="btn btn-ink btn-block" data-act="buy-now" data-id="${p.id}">${t("item.buyNow")}</button>
    <button class="btn btn-ghost btn-block" data-act="${inCart ? "open-cart" : "add"}" data-id="${p.id}">${t(inCart ? "item.inCart" : "item.addCart")}</button>`;
  return `<aside class="buybox">
    <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="big num">${priceLabel(p)}</span>${vat ? `<span class="muted">${vat}</span>` : ""}</div>
    ${buttons}
    <button class="btn btn-ghost btn-sm" style="align-self:flex-start" data-act="wish" data-id="${p.id}" aria-pressed="${saved}">${heart(saved)} ${t(saved ? "item.saved" : "item.save")}</button>
    <ul class="incl">${includedList(p).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
  </aside>`;
}

const tags = (p) => `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap"><span class="tag" style="background:#fff">${esc(p.cat)}</span><span class="tag" style="background:#fff">${kindLabel(p)}</span></div>`;
const aboutKey = (p) => (isCourse(p) ? "item.aboutCourse" : p.type === "bundle" ? "item.aboutBundle" : "item.aboutBook");
const descPanel = (p) => `<div class="panel"><h2>${t(aboutKey(p))}</h2>${p.description.map((d) => `<p style="margin:0 0 10px">${esc(d)}</p>`).join("")}</div>`;
const hero = (p, facts) => `<div class="item-hero">${heroBook(p)}<div>${tags(p)}<h1>${esc(p.title)}</h1><p class="sub">${esc(p.sub)}</p><div class="facts num">${facts}</div></div></div>`;

function courseMain(p) {
  const facts = `<span><b>${p.lessons.length}</b> ${t("item.lessons")}</span><span>${t("item.about", { h: `<b>${hoursLabel(courseMinutes(p))}</b>` })}</span><span>${t("item.writtenBy")} <b>${BRAND}</b></span>`;
  return `${hero(p, facts)}${descPanel(p)}
    ${p.outcomes.length ? `<div class="panel"><h2>${t("item.outcomes")}</h2><ul class="learn">${p.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul></div>` : ""}
    <div class="panel"><h2>${t("item.syllabus")}</h2><p class="muted" style="margin:-6px 0 10px">${t("item.syllabusSub", { n: p.lessons.length })}</p>
      <ol class="toc">${p.lessons.map((l) => `<li><span><b>${esc(l.title)}</b><br><small class="muted">${esc(l.summary)}</small></span><em>${t("item.minShort", { n: l.minutes })}</em></li>`).join("")}</ol></div>
    ${p.forWho.length ? `<div class="panel"><h2>${t("item.forWho")}</h2><ul class="incl">${p.forWho.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`;
}

function bookMain(p) {
  const facts = `<span>${t("item.by")} <b>${BRAND}</b></span><span><b>${p.pages}</b> ${t("item.pages")}</span><span><b>${p.mb} MB</b></span><span>${t("item.langLine")}</span>`;
  return `${hero(p, facts)}${descPanel(p)}
    ${p.excerpt ? `<div class="panel"><h2>${t("item.peek")}</h2><div class="paper"><h3>${esc(p.chapters[0] || p.title)}</h3><p>${esc(p.excerpt)}</p></div></div>` : ""}
    ${p.chapters.length ? `<div class="panel"><h2>${t("item.inside")}</h2><ol class="toc">${p.chapters.map((c) => `<li><span>${esc(c)}</span></li>`).join("")}</ol></div>` : ""}`;
}

function bundleMain(p) {
  const parts = p.includes.map((id) => ALL[id]).filter(Boolean);
  const separate = parts.reduce((sum, x) => sum + x.price, 0);
  const facts = `<span>${t("meta.books", { n: parts.length })}</span><span>${t("item.separate")} <b>${ils(separate)}</b></span><span>${t("item.inBundlePrice")} <b>${ils(p.price)}</b></span>`;
  return `${hero(p, facts)}${descPanel(p)}
    <div><h2 style="margin-bottom:14px">${t("item.inBundle")}</h2><div class="grid books">${parts.map(card).join("")}</div></div>`;
}

export function viewItem(id) {
  const p = ALL[id];
  const main = isCourse(p) ? courseMain(p) : p.type === "bundle" ? bundleMain(p) : bookMain(p);
  const related = [...COURSES, ...BOOKS].filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, RELATED_COUNT);
  const shelf = isCourse(p) ? ["#courses", t("nav.courses")] : ["#books", t("nav.books")];
  return `<div class="wrap"><nav class="crumbs" aria-label="breadcrumb"><a href="${HOME_URL}" data-home>${t("item.home")}</a> / <a href="${shelf[0]}">${shelf[1]}</a> / <span aria-current="page">${esc(p.title)}</span></nav></div>
  <div class="wrap item"><div class="item-main">${main}
    <div class="panel"><h2>${t("item.author")}</h2><p>${t("item.authorText", { brand: BRAND })}</p></div>
    ${related.length ? `<div><h2 style="margin-bottom:14px">${t("item.related")}</h2><div class="grid ${isCourse(p) ? "" : "books"}">${related.map(card).join("")}</div></div>` : ""}
  </div>${buyBox(p)}</div>`;
}
