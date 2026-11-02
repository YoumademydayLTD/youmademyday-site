// Catalog pages (courses / books) and search results.
import { COURSES, BOOKS, card } from "../catalog.js";
import { S } from "../state.js";
import { esc, ils, $ } from "../util.js";
import { t } from "../i18n/index.js";

const ALL_CATS = "*"; // filter value meaning "every topic"

const PRICE_STEP = { courses: 10, books: 5 };
const SORTS = {
  rec: { label: "shop.sort.rec", fn: (list) => (a, b) => list.indexOf(a) - list.indexOf(b) },
  low: { label: "shop.sort.low", fn: () => (a, b) => a.price - b.price },
  high: { label: "shop.sort.high", fn: () => (a, b) => b.price - a.price },
};

const listFor = (type) => (type === "courses" ? COURSES : BOOKS);
const priceRange = (list) => [Math.min(...list.map((p) => p.price)), Math.max(...list.map((p) => p.price))];

export function viewShop(type) {
  const list = listFor(type);
  const f = S.filters[type];
  const [minP, maxP] = priceRange(list);
  if (f.maxPrice === null) f.maxPrice = maxP;
  const cats = [ALL_CATS, ...new Set(list.map((p) => p.cat))];
  return `
  <div class="wrap page-head"><h1>${t(type === "courses" ? "shop.courses" : "shop.books")}</h1>
    <p class="muted" style="margin:10px 0 0">${t(type === "courses" ? "shop.coursesSub" : "shop.booksSub")}</p></div>
  <div class="wrap catalog">
    <aside class="filters">
      <div><h4>${t("shop.topic")}</h4><div class="chips">${cats.map((c) => `<button class="chip ${f.cat === c ? "on" : ""}" data-act="f-cat" data-type="${type}" data-v="${esc(c)}">${c === ALL_CATS ? t("shop.all") : esc(c)}<small>${c === ALL_CATS ? list.length : list.filter((p) => p.cat === c).length}</small></button>`).join("")}</div></div>
      <div class="field"><label for="maxPrice">${t("shop.maxPrice")} <span id="maxLbl" class="num">${ils(f.maxPrice)}</span></label>
        <input id="maxPrice" type="range" min="${minP}" max="${maxP}" step="${PRICE_STEP[type]}" value="${f.maxPrice}" data-type="${type}"></div>
    </aside>
    <div style="min-width:0">
      <div class="toolbar"><span class="muted" id="countLbl"></span>
        <select id="sort" aria-label="${t("shop.sort")}" data-type="${type}">${Object.entries(SORTS).map(([k, s]) => `<option value="${k}" ${f.sort === k ? "selected" : ""}>${t(s.label)}</option>`).join("")}</select></div>
      <div id="grid" class="grid ${type === "books" ? "books" : "courses-g"}"></div>
    </div>
  </div>`;
}

export function fillGrid(type) {
  const list = listFor(type);
  const f = S.filters[type];
  const rows = list
    .filter((p) => (f.cat === ALL_CATS || p.cat === f.cat) && p.price <= f.maxPrice)
    .sort(SORTS[f.sort].fn(list));
  $("#countLbl").textContent = t("shop.count", { n: rows.length });
  $("#grid").innerHTML = rows.length
    ? rows.map(card).join("")
    : `<div class="empty" style="grid-column:1/-1">${t("shop.empty")}</div>`;
}

export function viewSearch() {
  const q = S.query.trim();
  const hit = (p) => [p.title, p.sub, p.cat].join(" ").includes(q);
  const courses = q ? COURSES.filter(hit) : [];
  const books = q ? BOOKS.filter(hit) : [];
  return `<div class="wrap page-head"><h1>${t("search.title")}</h1><p class="muted" style="margin:10px 0 0">${q ? t("search.results", { n: courses.length + books.length, q: esc(q) }) : t("search.prompt")}</p></div>
  <div class="wrap" style="padding-bottom:40px;display:flex;flex-direction:column;gap:30px">
    ${courses.length ? `<div><h2 style="margin-bottom:14px">${t("shop.courses")}</h2><div class="grid courses-g">${courses.map(card).join("")}</div></div>` : ""}
    ${books.length ? `<div><h2 style="margin-bottom:14px">${t("shop.books")}</h2><div class="grid books">${books.map(card).join("")}</div></div>` : ""}
    ${q && !courses.length && !books.length ? `<div class="empty">${t("search.none")}</div>` : ""}
  </div>`;
}
