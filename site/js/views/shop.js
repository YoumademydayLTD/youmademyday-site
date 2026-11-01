// Catalog pages (courses / books) and search results.
import { COURSES, BOOKS, card } from "../catalog.js";
import { S } from "../state.js";
import { esc, ils, $ } from "../util.js";

const PRICE_STEP = { courses: 10, books: 5 };
const SORTS = {
  rec: { label: "מומלץ", fn: (list) => (a, b) => list.indexOf(a) - list.indexOf(b) },
  low: { label: "מחיר: נמוך לגבוה", fn: () => (a, b) => a.price - b.price },
  high: { label: "מחיר: גבוה לנמוך", fn: () => (a, b) => b.price - a.price },
};

const listFor = (type) => (type === "courses" ? COURSES : BOOKS);
const priceRange = (list) => [Math.min(...list.map((p) => p.price)), Math.max(...list.map((p) => p.price))];

export function viewShop(type) {
  const list = listFor(type);
  const f = S.filters[type];
  const [minP, maxP] = priceRange(list);
  if (f.maxPrice === null) f.maxPrice = maxP;
  const cats = ["הכל", ...new Set(list.map((p) => p.cat))];
  return `
  <div class="wrap page-head"><h1>${type === "courses" ? "קורסים" : "ספרים ותבניות"}</h1>
    <p class="muted" style="margin:6px 0 0">${type === "courses" ? "קורסים דיגיטליים: שיעורים כתובים, משימות ודפי עבודה להורדה" : "קובצי PDF להורדה מיידית, לקריאה ולהדפסה"}</p></div>
  <div class="wrap catalog">
    <aside class="filters">
      <div><h4>נושא</h4><div class="chips">${cats.map((c) => `<button class="chip ${f.cat === c ? "on" : ""}" data-act="f-cat" data-type="${type}" data-v="${esc(c)}">${esc(c)}<small>${c === "הכל" ? list.length : list.filter((p) => p.cat === c).length}</small></button>`).join("")}</div></div>
      <div class="field"><label for="maxPrice">מחיר עד: <span id="maxLbl" class="num">${ils(f.maxPrice)}</span></label>
        <input id="maxPrice" type="range" min="${minP}" max="${maxP}" step="${PRICE_STEP[type]}" value="${f.maxPrice}" data-type="${type}"></div>
    </aside>
    <div style="min-width:0">
      <div class="toolbar"><span class="muted" id="countLbl"></span>
        <select id="sort" aria-label="מיון" data-type="${type}">${Object.entries(SORTS).map(([k, s]) => `<option value="${k}" ${f.sort === k ? "selected" : ""}>${s.label}</option>`).join("")}</select></div>
      <div id="grid" class="grid ${type === "books" ? "books" : "courses-g"}"></div>
    </div>
  </div>`;
}

export function fillGrid(type) {
  const list = listFor(type);
  const f = S.filters[type];
  const rows = list
    .filter((p) => (f.cat === "הכל" || p.cat === f.cat) && p.price <= f.maxPrice)
    .sort(SORTS[f.sort].fn(list));
  $("#countLbl").textContent = `${rows.length} פריטים`;
  $("#grid").innerHTML = rows.length
    ? rows.map(card).join("")
    : `<div class="empty" style="grid-column:1/-1">אין תוצאות לסינון הזה. נסו להרחיב את טווח המחיר או לבחור ״הכל״.</div>`;
}

export function viewSearch() {
  const q = S.query.trim();
  const hit = (p) => [p.title, p.sub, p.cat].join(" ").includes(q);
  const courses = q ? COURSES.filter(hit) : [];
  const books = q ? BOOKS.filter(hit) : [];
  return `<div class="wrap page-head"><h1>חיפוש</h1><p class="muted" style="margin:6px 0 0">${q ? `${courses.length + books.length} תוצאות עבור ״${esc(q)}״` : "כתבו מילה בחיפוש למעלה"}</p></div>
  <div class="wrap" style="padding-bottom:40px;display:flex;flex-direction:column;gap:30px">
    ${courses.length ? `<div><h2 style="margin-bottom:14px">קורסים</h2><div class="grid courses-g">${courses.map(card).join("")}</div></div>` : ""}
    ${books.length ? `<div><h2 style="margin-bottom:14px">ספרים ותבניות</h2><div class="grid books">${books.map(card).join("")}</div></div>` : ""}
    ${q && !courses.length && !books.length ? `<div class="empty">לא מצאנו. נסו ״בישול״, ״שיווק״ או ״אקסל״.</div>` : ""}
  </div>`;
}
