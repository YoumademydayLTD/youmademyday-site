// Entry point: language, layout, routing (hash or clean slug) and all click / input handlers.
import { t, applyDocumentLanguage, HOME_URL } from "./i18n/index.js";
import { LANGS } from "./i18n/config.js";
import { ALL, isCourse } from "./catalog.js";
import { S, save } from "./state.js";
import { $, toast, ils } from "./util.js";
import { BIZ } from "./business.js";
import { renderLayout } from "./layout.js";
import { viewHome } from "./views/home.js";
import { viewShop, fillGrid, viewSearch } from "./views/shop.js";
import { viewItem } from "./views/item.js";
import { openDrawer, closeDrawer, viewCheckout } from "./views/cart.js";
import { viewPricing } from "./views/pricing.js";
import { viewTerms, viewPrivacy, viewRefunds, viewCookies, viewAccessibility, cancelText } from "./legal/pages.js";
import { mount, startMotion } from "./motion.js";
import { viewLogin } from "./views/telegram.js";
import { viewPlans } from "./views/plans.js";
import { viewBuy } from "./views/buy.js";
import { viewThanks, showDownloads } from "./views/thanks.js";
import { startPayment } from "./checkout/pay.js";
import { isDirectOffer, buyHref } from "./money.js";
import { mountLogin } from "./views/login-page.js";
import { fetchMe, logout, SESSION_EVENT } from "./telegram/session.js";
import { watchAccount } from "./telegram/account.js";
import { watchSignInReturn } from "./checkout/resume.js";
import { viewAccount, mountAccount, ACCOUNT_ACTIONS, ACCOUNT_ROUTE } from "./account/view.js";
import { isGateStale } from "./account/gate.js";
import { viewRead, mountRead, READ_ACTIONS, READ_PREFIX } from "./reader/view.js";
import { viewCompanion, mountCompanion, COMPANION_ACTIONS, COMPANION_CHANGES, COMPANION_ROUTE } from "./companion/view.js";

const PAGES = { courses: () => viewShop("courses"), books: () => viewShop("books"), checkout: viewCheckout, search: viewSearch, pricing: viewPricing, plans: viewPlans, login: viewLogin, [ACCOUNT_ROUTE]: viewAccount, [COMPANION_ROUTE]: viewCompanion, terms: viewTerms, privacy: viewPrivacy, refunds: viewRefunds, cookies: viewCookies, accessibility: viewAccessibility };
const SHOPS = new Set(["courses", "books"]);
// Routes that carry an id after a prefix: #buy-<item>, #thanks-<checkout id>, #read-<item>[-<unit>].
const PREFIX_VIEWS = { "buy-": viewBuy, "thanks-": viewThanks, [READ_PREFIX]: viewRead };
// Work a prefixed page starts once it is on screen.
const PREFIX_AFTER = { "thanks-": showDownloads, [READ_PREFIX]: mountRead };
// Work a plain page starts once it is on screen.
const PAGE_AFTER = { login: mountLogin, [ACCOUNT_ROUTE]: mountAccount, [COMPANION_ROUTE]: mountCompanion };
const RAIL_GAP = 20; // px, matches .rail gap in css/home.css

// Clean slugs (/he/pricing) work on the live site; a hash wins when present. The language prefix is not a route.
function currentRoute() {
  if (location.hash.length > 1) return location.hash.slice(1);
  const parts = location.pathname.split("/").filter(Boolean).filter((s, i) => !(i === 0 && s in LANGS));
  return parts[0] || "home";
}

const prefixOf = (r) => Object.keys(PREFIX_VIEWS).find((p) => r.startsWith(p));

function prefixView(r) {
  const prefix = prefixOf(r);
  return prefix ? PREFIX_VIEWS[prefix](r.slice(prefix.length)) : null;
}

function syncBadges() {
  const cart = S.cart.filter((id) => ALL[id]).length;
  $("#cartN").textContent = cart; $("#cartN").dataset.n = cart;
  $("#wishN").textContent = S.wish.length; $("#wishN").dataset.n = S.wish.length;
}

function route() {
  const r = currentRoute();
  $("#view").innerHTML = PAGES[r] ? PAGES[r]() : prefixView(r) ?? (ALL[r] ? viewItem(r) : viewHome());
  if (SHOPS.has(r)) fillGrid(r);
  mount($("#view"));
  const prefix = prefixOf(r);
  if (prefix) PREFIX_AFTER[prefix]?.(r.slice(prefix.length));
  PAGE_AFTER[r]?.();
  const section = ALL[r] ? (isCourse(ALL[r]) ? "courses" : "books") : r;
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("on", a.dataset.nav === section));
  document.title = ALL[r] ? t("meta.itemTitle", { title: ALL[r].title }) : t("meta.title");
  syncBadges();
  window.scrollTo(0, 0);
  if (r === "refunds" && S.goCancel) { S.goCancel = false; $("#cancelForm")?.scrollIntoView({ block: "start" }); }
}

function rerender() { const y = window.scrollY; route(); window.scrollTo(0, y); }

async function copyText(text, done) {
  try { await navigator.clipboard.writeText(text); toast(done); }
  catch { toast(t("toast.copyFail", { email: BIZ.email })); }
}

function toggleWish(id) {
  const i = S.wish.indexOf(id);
  if (i >= 0) { S.wish.splice(i, 1); toast(t("toast.unsaved")); } else { S.wish.push(id); toast(t("toast.saved")); }
  save();
}

// A direct offer is bought alone on its own page, so it never enters the cart. Returns whether it was added.
function addToCart(id) {
  if (isDirectOffer(ALL[id])) { location.hash = buyHref(id).slice(1); return false; }
  if (!S.cart.includes(id)) { S.cart.push(id); save(); }
  return true;
}

function scrollRail(dir) {
  const rail = $("#rail");
  const forward = document.documentElement.dir === "rtl" ? -1 : 1; // "next" moves toward the reading direction
  const step = rail.firstElementChild.offsetWidth + RAIL_GAP;
  rail.scrollBy({ left: (dir === "next" ? forward : -forward) * step, behavior: "smooth" });
}

// Signing out removes the button that had focus, so focus moves to the header's «log in» link.
async function signOut() {
  const done = logout();
  document.querySelector("#acctSlot .tg-login")?.focus();
  toast(t("toast.loggedOut"));
  await done;
}

const ACTIONS = {
  wish: (el) => { toggleWish(el.dataset.id); const r = currentRoute(); SHOPS.has(r) ? fillGrid(r) : rerender(); syncBadges(); },
  add: (el) => { if (!addToCart(el.dataset.id)) return; toast(t("toast.added")); rerender(); openDrawer("cart"); },
  "buy-now": (el) => { if (addToCart(el.dataset.id)) location.hash = "checkout"; },
  "open-cart": () => openDrawer("cart"),
  "open-wish": () => openDrawer("wish"),
  close: closeDrawer,
  "close-go": closeDrawer,
  remove: (el) => { S.cart = S.cart.filter((x) => x !== el.dataset.id); save(); syncBadges(); if ($("#drawerRoot").innerHTML) openDrawer("cart"); if (currentRoute() === "checkout") rerender(); },
  "wish-to-cart": (el) => { if (!addToCart(el.dataset.id)) { closeDrawer(); return; } S.wish = S.wish.filter((x) => x !== el.dataset.id); save(); syncBadges(); openDrawer("cart"); toast(t("toast.moved")); },
  "f-cat": (el) => { S.filters[el.dataset.type].cat = el.dataset.v; el.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === el)); fillGrid(el.dataset.type); },
  "pick-cat": (el, e) => { const cat = el.dataset.cat; const inBooks = Object.values(ALL).some((p) => !isCourse(p) && p.cat === cat); const shop = inBooks ? "books" : "courses"; S.filters[shop].cat = cat; e.preventDefault(); location.hash = shop; },
  rail: (el) => scrollRail(el.dataset.dir),
  jump: (el) => document.getElementById(el.dataset.to)?.scrollIntoView({ behavior: "smooth", block: "start" }),
  "go-cancel": () => { S.goCancel = true; if (currentRoute() === "refunds") { S.goCancel = false; $("#cancelForm")?.scrollIntoView({ block: "start" }); } else location.hash = "refunds"; },
  "copy-cancel": () => copyText(cancelText(), t("toast.copied")),
  "copy-email": () => copyText(BIZ.email, t("toast.emailCopied")),
  pay: (el) => startPayment(el, currentRoute()),
  logout: signOut,
  ...ACCOUNT_ACTIONS,
  ...READ_ACTIONS,
  ...COMPANION_ACTIONS,
};
// Selects and switches act on «change», not on click: a click handler's preventDefault would stop them toggling.
const CHANGES = { ...COMPANION_CHANGES };
const KEEP_DEFAULT = new Set(["close-go"]);

applyDocumentLanguage();
renderLayout();
watchAccount();
watchSignInReturn(currentRoute);
fetchMe();

// Home has a clean address (no #home): go there in place, without a reload.
function goHome() {
  closeDrawer();
  history.pushState(null, "", HOME_URL);
  route();
}
if (location.hash === "#home") history.replaceState(null, "", HOME_URL);

document.addEventListener("click", (e) => {
  const home = e.target.closest("a[data-home]");
  if (home && !e.metaKey && !e.ctrlKey && !e.shiftKey) { e.preventDefault(); goHome(); return; }
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
  $("#maxLbl").textContent = ils(Number(e.target.value));
  fillGrid(type);
});
document.addEventListener("change", (e) => {
  if (e.target.id === "sort") { S.filters[e.target.dataset.type].sort = e.target.value; fillGrid(e.target.dataset.type); return; }
  CHANGES[e.target.dataset.change]?.(e.target);
});
document.addEventListener("submit", (e) => {
  if (e.target.id !== "topSearch") return;
  e.preventDefault();
  S.query = $("#q").value;
  if (currentRoute() === "search") route(); else location.hash = "search";
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#drawerRoot").innerHTML) closeDrawer(); });
window.addEventListener("hashchange", () => { closeDrawer(); route(); });
// Signing in or out redraws the login page, and the signed-in-only pages (personal area, reader, companion),
// into their other state. Only when the state really changed: /api/me announces on every page load.
window.addEventListener(SESSION_EVENT, () => {
  if (currentRoute() === "login" || isGateStale()) rerender();
});
window.addEventListener("popstate", () => { closeDrawer(); route(); });
startMotion();
route();
