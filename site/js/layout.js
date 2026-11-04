// Page chrome in the active language: header capsule, footer and the language picker.
import { t, LANG, urlIn, HOME_URL } from "./i18n/index.js";
import { LANGS, LIVE } from "./i18n/config.js";
import { BIZ_FOR } from "./business.js";
import { botUrl } from "./telegram/bot.js";

const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

function header() {
  const nav = [["home", "nav.home"], ["plans", "nav.plans"], ["courses", "nav.courses"], ["books", "nav.books"], ["refunds", "nav.help"]];
  return `<a class="skip" href="#view">${t("skip")}</a>
  <header class="top"><div class="top-row">
    <a class="logo" href="${HOME_URL}" data-home aria-label="${t("nav.homeLabel")}"><span class="mark">${icon("i-mark")}<span class="tg-dot">${icon("i-plane")}</span></span><span class="logo-en">You Made My Day</span></a>
    <nav class="main" id="nav">${nav.map(([r, k]) => `<a href="${r === "home" ? HOME_URL : `#${r}`}" data-nav="${r}"${r === "home" ? " data-home" : ""}>${t(k)}</a>`).join("")}</nav>
    <form class="top-search" id="topSearch" role="search">${icon("i-search")}<input id="q" type="search" placeholder="${t("nav.search")}" aria-label="${t("nav.searchLabel")}"></form>
    <div class="icons">
      <button class="icon-btn" data-act="open-wish" aria-label="${t("nav.wish")}">${icon("i-heart")}<span class="badge" id="wishN" data-n="0">0</span></button>
      <button class="icon-btn" data-act="open-cart" aria-label="${t("nav.cart")}">${icon("i-bag")}<span class="badge" id="cartN" data-n="0">0</span></button>
    </div>
    <a class="btn btn-tg tg-login" href="#login" aria-label="${t("nav.loginLabel")}">${icon("i-plane")}<span>${t("nav.login")}</span></a>
  </div></header>`;
}

// A small native <select>: accessible by keyboard and screen readers on every platform.
const langPicker = () => `<label class="lang-pick">${icon("i-globe")}<span class="sr">${t("foot.lang")}</span>
  <select id="langPick" aria-label="${t("foot.lang")}">${Object.entries(LANGS).filter(([code]) => LIVE.includes(code)).map(([code, l]) => `<option value="${code}" lang="${code}" ${code === LANG ? "selected" : ""}>${l.name}</option>`).join("")}</select></label>`;

function footer() {
  const b = BIZ_FOR(LANG);
  const col = (title, items) => `<div><h4>${t(title)}</h4><ul>${items.map(([href, k, extra = ""]) => `<li><a href="${href}"${extra}>${t(k)}</a></li>`).join("")}</ul></div>`;
  return `<footer class="site"><div class="wrap">
    <p class="foot-note">${t("foot.note")}</p>
    <div class="foot-grid">
      ${col("foot.shop", [["#plans", "nav.plans"], ["#courses", "nav.courses"], ["#books", "nav.books"], ["#pricing", "foot.pricing"]])}
      ${col("foot.help", [[botUrl("support"), "foot.tgSupport"], ["#login", "nav.login"], ["#refunds", "foot.refunds"], ["#refunds", "foot.cancel", ' data-act="go-cancel"'], ["#accessibility", "foot.a11y"]])}
      ${col("foot.legal", [["#terms", "foot.terms"], ["#privacy", "foot.privacy"], ["#cookies", "foot.cookies"]])}
      <div><h4>${t("foot.company")}</h4><ul><li>${b.name}</li><li>${b.id}</li><li>${b.addr}</li><li><a href="mailto:${b.email}">${b.email}</a></li></ul></div>
    </div>
    <div class="foot-bottom"><span>${t("foot.rights", { year: new Date().getFullYear() })}</span>${langPicker()}</div>
  </div></footer>`;
}

export function renderLayout() {
  document.getElementById("app").innerHTML = `${header()}<main id="view" tabindex="-1"></main>${footer()}`;
  document.getElementById("langPick").addEventListener("change", (e) => {
    const route = location.hash.slice(1) || location.pathname.split("/").filter(Boolean).filter((s) => !(s in LANGS)).join("/");
    location.href = urlIn(e.target.value, route);
  });
}
