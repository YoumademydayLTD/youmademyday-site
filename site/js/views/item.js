// Product page: course, e-book / template, or bundle.
import { ALL, COURSES, BOOKS, card, cover, heart, isCourse, kindLabel, courseMinutes, hoursLabel } from "../catalog.js";
import { S } from "../state.js";
import { esc, ils } from "../util.js";
import { BRAND, REFUND_DAYS } from "../business.js";

const RELATED_COUNT = 4;

function includedList(p) {
  if (isCourse(p)) {
    return [`${p.lessons.length} שיעורים כתובים`, `כ-${hoursLabel(courseMinutes(p))} של לימוד ותרגול`, "דף עבודה לכל שיעור", "הכל בקובצי PDF להורדה", "נפתח בכל מכשיר ואפשר להדפיס", `${REFUND_DAYS} יום להחזר מלא`];
  }
  if (p.type === "bundle") return [`${p.includes.length} ספרים בקובצי PDF`, "נשלח למייל מיד אחרי התשלום", "נפתח בכל מכשיר"];
  return [`${p.pages} עמודים`, `קובץ PDF, ${p.mb} MB`, "נשלח למייל מיד אחרי התשלום", "נפתח בכל מכשיר ואפשר להדפיס"];
}

function buyBox(p) {
  const inCart = S.cart.includes(p.id);
  const saved = S.wish.includes(p.id);
  return `<aside class="buybox">
    <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap"><span class="big num">${ils(p.price)}</span><span class="muted">כולל מע״מ</span></div>
    <button class="btn btn-sun btn-block" data-act="buy-now" data-id="${p.id}">לקנות עכשיו</button>
    <button class="btn btn-ghost btn-block" data-act="${inCart ? "open-cart" : "add"}" data-id="${p.id}">${inCart ? "בסל, לצפייה בסל" : "להוסיף לסל"}</button>
    <button class="btn btn-ghost btn-sm" data-act="wish" data-id="${p.id}" aria-pressed="${saved}">${heart(saved)} ${saved ? "במועדפים" : "לשמור למועדפים"}</button>
    <ul class="incl">${includedList(p).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
  </aside>`;
}

const tags = (p) => `<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap"><span class="tag">${esc(p.cat)}</span><span class="tag">${kindLabel(p)}</span></div>`;
const descPanel = (p) => `<div class="panel"><h2>על ${isCourse(p) ? "הקורס" : p.type === "bundle" ? "החבילה" : "הספר"}</h2>${p.description.map((d) => `<p style="margin:0 0 10px">${esc(d)}</p>`).join("")}</div>`;

function courseMain(p) {
  return `
    <div class="item-hero">${cover(p, { large: true })}
      <div>${tags(p)}<h1>${esc(p.title)}</h1><p class="sub">${esc(p.sub)}</p></div>
      <div class="facts num"><span><b>${p.lessons.length}</b> שיעורים</span><span>כ-<b>${hoursLabel(courseMinutes(p))}</b></span><span>נכתב והופק על ידי <b>${BRAND}</b></span></div>
    </div>
    ${descPanel(p)}
    ${p.outcomes.length ? `<div class="panel"><h2>מה תדעו לעשות בסוף</h2><ul class="learn">${p.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul></div>` : ""}
    <div class="panel"><h2>תוכנית הקורס</h2><p class="muted" style="margin:-6px 0 10px">${p.lessons.length} שיעורים · כל שיעור עם משימה ודף עבודה</p>
      <ol class="toc">${p.lessons.map((l) => `<li><span><b>${esc(l.title)}</b><br><small class="muted">${esc(l.summary)}</small></span><em>${l.minutes} דק׳</em></li>`).join("")}</ol></div>
    ${p.forWho.length ? `<div class="panel"><h2>למי זה מתאים</h2><ul class="incl">${p.forWho.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}`;
}

function bookMain(p) {
  return `
    <div class="item-hero book">${cover(p, { large: true })}
      <div>${tags(p)}<h1>${esc(p.title)}</h1><p class="sub">${esc(p.sub)}</p>
      <div class="facts num" style="margin-top:14px"><span>מאת <b>${BRAND}</b></span><span><b>${p.pages}</b> עמודים</span><span><b>${p.mb} MB</b></span><span>עברית · 2026</span></div></div>
    </div>
    ${descPanel(p)}
    ${p.excerpt ? `<div class="panel"><h2>הצצה לספר</h2><div class="paper"><h3>${esc(p.chapters[0] || p.title)}</h3><p>${esc(p.excerpt)}</p></div></div>` : ""}
    ${p.chapters.length ? `<div class="panel"><h2>מה בפנים</h2><ol class="toc">${p.chapters.map((c) => `<li><span>${esc(c)}</span></li>`).join("")}</ol></div>` : ""}`;
}

function bundleMain(p) {
  const parts = p.includes.map((id) => ALL[id]).filter(Boolean);
  const separate = parts.reduce((sum, x) => sum + x.price, 0);
  return `
    <div class="item-hero book">${cover(p, { large: true })}
      <div>${tags(p)}<h1>${esc(p.title)}</h1><p class="sub">${esc(p.sub)}</p>
      <div class="facts num" style="margin-top:14px"><span><b>${parts.length}</b> ספרים</span><span>בנפרד: <b>${ils(separate)}</b></span><span>בחבילה: <b>${ils(p.price)}</b></span></div></div>
    </div>
    ${descPanel(p)}
    <div><h2 style="margin-bottom:14px">מה בחבילה</h2><div class="grid books">${parts.map(card).join("")}</div></div>`;
}

export function viewItem(id) {
  const p = ALL[id];
  const main = isCourse(p) ? courseMain(p) : p.type === "bundle" ? bundleMain(p) : bookMain(p);
  const related = [...COURSES, ...BOOKS].filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, RELATED_COUNT);
  const shelf = isCourse(p) ? ["#courses", "קורסים"] : ["#books", "ספרים ותבניות"];
  return `<div class="wrap"><div class="crumbs"><a href="#home">ראשי</a> / <a href="${shelf[0]}">${shelf[1]}</a> / <span>${esc(p.title)}</span></div></div>
  <div class="wrap item"><div class="item-main">${main}
    <div class="panel"><h2>מי כתב</h2><p style="margin:0">כל התוכן נכתב והופק על ידי צוות ${BRAND}. אנחנו לא מוכרים תוכן של אחרים.</p></div>
    ${related.length ? `<div><h2 style="margin-bottom:14px">עוד באותו נושא</h2><div class="grid ${isCourse(p) ? "courses-g" : "books"}">${related.map(card).join("")}</div></div>` : ""}
  </div>${buyBox(p)}</div>`;
}
