// Product catalog access and the shared product card.
import { PRODUCTS } from "./products.js";
import { esc, ils } from "./util.js";
import { S } from "./state.js";
import { BOOK_DEAL_MIN } from "./business.js";
import { bookStage } from "./book3d.js";

export const ALL = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
export const COURSES = PRODUCTS.filter((p) => p.type === "course");
// "books" shelf = e-books, printable templates and bundles (all delivered as PDF)
export const BOOKS = PRODUCTS.filter((p) => p.type !== "course");

const KIND_LABEL = { course: "קורס דיגיטלי", ebook: "ספר PDF", template: "תבנית להדפסה", bundle: "חבילה" };
export const kindLabel = (p) => KIND_LABEL[p.type];
export const isCourse = (p) => p.type === "course";
export const isPdf = (p) => p.type === "ebook" || p.type === "template";

export const courseMinutes = (p) => p.lessons.reduce((sum, l) => sum + l.minutes, 0);
export const hoursLabel = (minutes) => {
  const hours = Math.round((minutes / 60) * 2) / 2;
  return hours < 1 ? `${minutes} דקות` : `${hours} שעות`;
};

// Soft glow behind a card's book, taken from the cover's motif colour.
const glowOf = (p) => `${p.cv[2]}55`;

const heartIcon = (on) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>`;
export const heart = heartIcon;

function cardMeta(p) {
  if (isCourse(p)) return `<span>${p.lessons.length} שיעורים</span><span>${hoursLabel(courseMinutes(p))}</span>`;
  if (p.type === "bundle") return `<span>${p.includes.length} ספרים</span><span>PDF</span>`;
  return `<span>${p.pages} עמ׳</span><span>PDF</span>`;
}

export function card(p) {
  const saved = S.wish.includes(p.id);
  return `<a class="card" href="#${p.id}" style="--g:${glowOf(p)}">
    <button class="wish ${saved ? "on" : ""}" data-act="wish" data-id="${p.id}" aria-label="${saved ? "הסרה מהמועדפים" : "שמירה במועדפים"}" aria-pressed="${saved}">${heartIcon(saved)}</button>
    ${bookStage(p, { glow: true, style: "--ry:-24deg" })}
    <div class="card-body"><span class="by">${esc(p.cat)}</span><h3>${esc(p.title)}</h3>
    <div class="meta">${cardMeta(p)}</div>
    <div class="price-row"><span class="price">${ils(p.price)}</span><span class="btn btn-ink btn-sm">לפרטים</span></div></div></a>`;
}

// Cart totals: the only automatic offer is "3 books, the cheapest free".
export function totals(ids) {
  const items = ids.map((id) => ALL[id]).filter(Boolean);
  const subtotal = items.reduce((sum, p) => sum + p.price, 0);
  const books = items.filter(isPdf);
  const bookDeal = books.length >= BOOK_DEAL_MIN ? Math.min(...books.map((b) => b.price)) : 0;
  return { subtotal, bookDeal, total: subtotal - bookDeal };
}
