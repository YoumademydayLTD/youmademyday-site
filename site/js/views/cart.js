// Cart drawer, wishlist drawer and the checkout page.
import { ALL, kindLabel, totals, isPdf } from "../catalog.js";
import { flatCover } from "../book3d.js";
import { S } from "../state.js";
import { esc, ils, $ } from "../util.js";
import { BIZ, BOOK_DEAL_MIN } from "../business.js";

export function lineHtml(id) {
  const p = ALL[id];
  return `<div class="line">${flatCover(p)}<div style="min-width:0"><h4>${esc(p.title)}</h4><small>${kindLabel(p)}</small><br><button class="x" data-act="remove" data-id="${id}">הסרה</button></div><b class="num">${ils(p.price)}</b></div>`;
}

export function summaryHtml() {
  const t = totals(S.cart);
  return `<div class="sum"><span>סכום ביניים</span><span class="num">${ils(t.subtotal)}</span></div>
    ${t.bookDeal ? `<div class="sum" style="color:var(--ok)"><span>${BOOK_DEAL_MIN} ספרים, הזול חינם</span><span class="num">−${ils(t.bookDeal)}</span></div>` : ""}
    <div class="sum total"><span>לתשלום (כולל מע״מ)</span><span class="num">${ils(t.total)}</span></div>`;
}

export function openDrawer(kind) {
  const isCart = kind !== "wish";
  const ids = (isCart ? S.cart : S.wish).filter((id) => ALL[id]);
  const books = S.cart.filter((id) => ALL[id] && isPdf(ALL[id])).length;
  const wishLine = (id) => `<div class="line">${flatCover(ALL[id])}<div style="min-width:0"><h4>${esc(ALL[id].title)}</h4><small>${ils(ALL[id].price)}</small></div><button class="btn btn-ghost btn-sm" data-act="wish-to-cart" data-id="${id}">לסל</button></div>`;
  const nudge = isCart && books > 0 && books < BOOK_DEAL_MIN
    ? `<div class="tag tag-ok" style="padding:8px 12px;font-size:13px">עוד ${BOOK_DEAL_MIN - books} ${BOOK_DEAL_MIN - books === 1 ? "ספר" : "ספרים"} והזול מביניהם בחינם</div>` : "";
  $("#drawerRoot").innerHTML = `<div class="overlay" data-act="close"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="${isCart ? "סל קניות" : "מועדפים"}">
    <header><h2>${isCart ? "הסל שלך" : "מועדפים"}</h2><button class="icon-btn" data-act="close" aria-label="סגירה" style="background:var(--tile)">✕</button></header>
    <div class="list">${ids.length ? ids.map(isCart ? lineHtml : wishLine).join("") : `<div class="empty">${isCart ? "הסל ריק כרגע." : "עוד לא שמרתם כלום. לחצו על הלב בכל מוצר."}</div>`}${nudge}</div>
    ${isCart && ids.length ? `<div class="foot">${summaryHtml()}<a class="btn btn-ink btn-block" href="#checkout" data-act="close-go">להמשך לתשלום</a></div>` : ""}
  </aside>`;
  $("#drawerRoot .drawer button").focus();
}

export const closeDrawer = () => { $("#drawerRoot").innerHTML = ""; };

// Card payment opens once the payment provider approves the store; until then the page says so plainly.
export function viewCheckout() {
  if (!S.cart.length) {
    return `<div class="wrap success"><h1>הסל ריק</h1><p class="muted">עוד לא בחרתם כלום.</p><a class="btn btn-ink" href="#courses">לקורסים</a></div>`;
  }
  return `<div class="wrap page-head"><h1>תשלום</h1></div>
  <div class="wrap checkout">
    <div class="panel" style="display:flex;flex-direction:column;gap:12px">
      <h2 style="margin:0">התשלום המאובטח נפתח בקרוב</h2>
      <p style="margin:0">אנחנו מסיימים את חיבור התשלום המאובטח באשראי. עד אז אי אפשר לבצע רכישה באתר, ושום כרטיס לא מחויב.</p>
      <p style="margin:0">רוצים לקנות כבר עכשיו או לקבל הודעה כשנפתח? כתבו לנו ל-<b>${BIZ.email}</b> עם שמות המוצרים.</p>
      <ul class="incl"><li>התשלום יעבור דרך ספק סליקה מאובטח. אנחנו לא שומרים פרטי כרטיס.</li><li>מיד אחרי התשלום יישלח מייל עם קישורי ההורדה וחשבונית.</li><li>כל המחירים בשקלים וכוללים מע״מ.</li></ul>
    </div>
    <aside class="buybox"><h2 style="margin:0;font-size:22px">ההזמנה שלך</h2>
      <div style="display:flex;flex-direction:column;gap:10px">${S.cart.filter((id) => ALL[id]).map(lineHtml).join("")}</div>
      <div style="display:flex;flex-direction:column;gap:8px">${summaryHtml()}</div>
      <button class="btn btn-ink btn-block" disabled aria-disabled="true">התשלום ייפתח בקרוב</button>
    </aside>
  </div>`;
}
