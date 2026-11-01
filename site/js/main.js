// Entry point: routing (hash or clean slug) and all click / input handlers.
import { ALL, isCourse } from "./catalog.js";
import { S, save } from "./state.js";
import { $, toast } from "./util.js";
import { BIZ } from "./business.js";
import { viewHome } from "./views/home.js";
import { viewShop, fillGrid, viewSearch } from "./views/shop.js";
import { viewItem } from "./views/item.js";
import { openDrawer, closeDrawer, viewCheckout } from "./views/cart.js";
import { viewPricing } from "./views/pricing.js";
import { viewTerms } from "./legal/terms.js";
import { viewPrivacy } from "./legal/privacy.js";
import { viewRefunds, CANCEL_TEXT } from "./legal/refunds.js";

const PAGES = { courses: () => viewShop("courses"), books: () => viewShop("books"), checkout: viewCheckout, search: viewSearch, pricing: viewPricing, terms: viewTerms, privacy: viewPrivacy, refunds: viewRefunds };
const SHOPS = new Set(["courses", "books"]);

// Clean slugs (/pricing) work on the live site; a hash wins when present.
const currentRoute = () => location.hash.slice(1) || location.pathname.replace(/^\/+|\/+$/g, "") || "home";

function syncBadges() {
  const cart = S.cart.filter((id) => ALL[id]).length;
  $("#cartN").textContent = cart; $("#cartN").dataset.n = cart;
  $("#wishN").textContent = S.wish.length; $("#wishN").dataset.n = S.wish.length;
}

function route() {
  const r = currentRoute();
  $("#view").innerHTML = PAGES[r] ? PAGES[r]() : ALL[r] ? viewItem(r) : viewHome();
  if (SHOPS.has(r)) fillGrid(r);
  const section = ALL[r] ? (isCourse(ALL[r]) ? "courses" : "books") : r;
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.nav === section));
  document.title = ALL[r] ? `${ALL[r].title} · You Made My Day` : "You Made My Day · עשית לי את היום";
  syncBadges();
  window.scrollTo(0, 0);
  if (r === "refunds" && S.goCancel) { S.goCancel = false; $("#cancelForm")?.scrollIntoView({ block: "start" }); }
}

function rerender() { const y = window.scrollY; route(); window.scrollTo(0, y); }

async function copyText(text, done) {
  try { await navigator.clipboard.writeText(text); toast(done); }
  catch { toast(`לא הצלחתי להעתיק. הכתובת: ${BIZ.email}`); }
}

function toggleWish(id) {
  const i = S.wish.indexOf(id);
  if (i >= 0) { S.wish.splice(i, 1); toast("הוסר מהמועדפים"); } else { S.wish.push(id); toast("נשמר במועדפים"); }
  save();
}

function addToCart(id) {
  if (!S.cart.includes(id)) { S.cart.push(id); save(); }
}

const ACTIONS = {
  wish: (el) => { toggleWish(el.dataset.id); const r = currentRoute(); SHOPS.has(r) ? fillGrid(r) : rerender(); syncBadges(); },
  add: (el) => { addToCart(el.dataset.id); toast("נוסף לסל"); rerender(); openDrawer("cart"); },
  "buy-now": (el) => { addToCart(el.dataset.id); location.hash = "checkout"; },
  "open-cart": () => openDrawer("cart"),
  "open-wish": () => openDrawer("wish"),
  close: closeDrawer,
  "close-go": closeDrawer,
  remove: (el) => { S.cart = S.cart.filter((x) => x !== el.dataset.id); save(); syncBadges(); if ($("#drawerRoot").innerHTML) openDrawer("cart"); if (currentRoute() === "checkout") rerender(); },
  "wish-to-cart": (el) => { addToCart(el.dataset.id); S.wish = S.wish.filter((x) => x !== el.dataset.id); save(); syncBadges(); openDrawer("cart"); toast("הועבר לסל"); },
  "f-cat": (el) => { S.filters[el.dataset.type].cat = el.dataset.v; el.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === el)); fillGrid(el.dataset.type); },
  "pick-cat": (el, e) => { const cat = el.dataset.cat; const inBooks = [...Object.values(ALL)].some((p) => !isCourse(p) && p.cat === cat); const shop = inBooks ? "books" : "courses"; S.filters[shop].cat = cat; e.preventDefault(); location.hash = shop; },
  jump: (el) => document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: "smooth", block: "start" }),
  "go-cancel": () => { S.goCancel = true; if (currentRoute() === "refunds") { S.goCancel = false; $("#cancelForm")?.scrollIntoView({ block: "start" }); } else location.hash = "refunds"; },
  "copy-cancel": () => copyText(CANCEL_TEXT, "הנוסח הועתק. מדביקים במייל ושולחים"),
  "copy-email": () => copyText(BIZ.email, "כתובת המייל הועתקה"),
};
const KEEP_DEFAULT = new Set(["close-go"]);

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  if (!KEEP_DEFAULT.has(act)) e.preventDefault();
  e.stopPropagation();
  ACTIONS[act]?.(el, e);
});
document.addEventListener("input", (e) => {
  if (e.target.id !== "maxPrice") return;
  const type = e.target.dataset.type;
  S.filters[type].maxPrice = Number(e.target.value);
  $("#maxLbl").textContent = `${Math.round(S.filters[type].maxPrice).toLocaleString("he-IL")} ₪`;
  fillGrid(type);
});
document.addEventListener("change", (e) => {
  if (e.target.id === "sort") { S.filters[e.target.dataset.type].sort = e.target.value; fillGrid(e.target.dataset.type); }
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "topSearch") return;
  e.preventDefault();
  S.query = $("#q").value;
  if (currentRoute() === "search") route(); else location.hash = "search";
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#drawerRoot").innerHTML) closeDrawer(); });
window.addEventListener("hashchange", () => { closeDrawer(); route(); });
route();
