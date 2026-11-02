// Cart drawer, wishlist drawer and the checkout page.
import { ALL, kindLabel, totals, isPdf } from "../catalog.js";
import { flatCover } from "../book3d.js";
import { S } from "../state.js";
import { esc, ils, $ } from "../util.js";
import { BIZ, BOOK_DEAL_MIN } from "../business.js";
import { t, tList } from "../i18n/index.js";

export function lineHtml(id) {
  const p = ALL[id];
  return `<div class="line">${flatCover(p)}<div style="min-width:0"><h4>${esc(p.title)}</h4><small>${kindLabel(p)}</small><br><button class="x" data-act="remove" data-id="${id}">${t("cart.remove")}</button></div><b class="num">${ils(p.price)}</b></div>`;
}

export function summaryHtml() {
  const sum = totals(S.cart);
  return `<div class="sum"><span>${t("cart.subtotal")}</span><span class="num">${ils(sum.subtotal)}</span></div>
    ${sum.bookDeal ? `<div class="sum" style="color:var(--ok)"><span>${t("cart.deal", { n: BOOK_DEAL_MIN })}</span><span class="num">−${ils(sum.bookDeal)}</span></div>` : ""}
    <div class="sum total"><span>${t("cart.total")}</span><span class="num">${ils(sum.total)}</span></div>`;
}

const wishLine = (id) => `<div class="line">${flatCover(ALL[id])}<div style="min-width:0"><h4>${esc(ALL[id].title)}</h4><small>${ils(ALL[id].price)}</small></div><button class="btn btn-ghost btn-sm" data-act="wish-to-cart" data-id="${id}">${t("cart.toCart")}</button></div>`;

export function openDrawer(kind) {
  const isCart = kind !== "wish";
  const ids = (isCart ? S.cart : S.wish).filter((id) => ALL[id]);
  const books = S.cart.filter((id) => ALL[id] && isPdf(ALL[id])).length;
  const nudge = isCart && books > 0 && books < BOOK_DEAL_MIN
    ? `<div class="tag tag-ok" style="padding:8px 14px;font-size:14px">${t("cart.nudge", { n: BOOK_DEAL_MIN - books })}</div>` : "";
  const title = t(isCart ? "cart.title" : "cart.wishTitle");
  $("#drawerRoot").innerHTML = `<div class="overlay" data-act="close"></div>
  <aside class="drawer" role="dialog" aria-modal="true" aria-label="${title}">
    <header><h2>${title}</h2><button class="icon-btn" data-act="close" aria-label="${t("cart.close")}" style="background:var(--tile)">✕</button></header>
    <div class="list">${ids.length ? ids.map(isCart ? lineHtml : wishLine).join("") : `<div class="empty">${t(isCart ? "cart.empty" : "cart.wishEmpty")}</div>`}${nudge}</div>
    ${isCart && ids.length ? `<div class="foot">${summaryHtml()}<a class="btn btn-ink btn-block" href="#checkout" data-act="close-go">${t("cart.checkout")}</a></div>` : ""}
  </aside>`;
  $("#drawerRoot .drawer button").focus();
}

export const closeDrawer = () => { $("#drawerRoot").innerHTML = ""; };

// Card payment opens once the payment provider approves the store; until then the page says so plainly.
export function viewCheckout() {
  if (!S.cart.length) {
    return `<div class="wrap success"><h1>${t("checkout.emptyTitle")}</h1><p class="muted">${t("checkout.emptyText")}</p><a class="btn btn-ink" href="#courses">${t("home.ctaCourses")}</a></div>`;
  }
  return `<div class="wrap page-head"><h1>${t("checkout.title")}</h1></div>
  <div class="wrap checkout">
    <div class="panel" style="display:flex;flex-direction:column;gap:12px">
      <h2 style="margin:0">${t("checkout.soonTitle")}</h2>
      <p>${t("checkout.soon1")}</p>
      <p>${t("checkout.soon2", { email: `<b>${BIZ.email}</b>` })}</p>
      <ul class="incl">${tList("checkout.points").map((x) => `<li>${x}</li>`).join("")}</ul>
    </div>
    <aside class="buybox"><h2 style="margin:0;font-size:22px">${t("checkout.order")}</h2>
      <div style="display:flex;flex-direction:column;gap:10px">${S.cart.filter((id) => ALL[id]).map(lineHtml).join("")}</div>
      <div style="display:flex;flex-direction:column;gap:8px">${summaryHtml()}</div>
      <button class="btn btn-ink btn-block" disabled aria-disabled="true">${t("checkout.soonBtn")}</button>
    </aside>
  </div>`;
}
