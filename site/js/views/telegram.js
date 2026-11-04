// Telegram pieces: the bot chat phone, the three steps, subscription plans, topic tracks,
// the support band, and the plans and login pages that use them.
import { t, tList } from "../i18n/index.js";
import { ils } from "../util.js";
import { PLANS, TRACKS } from "../telegram/plans.js";
import { botUrl, isBotLive } from "../telegram/bot.js";

const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const LOGIN_CODE_LENGTH = 6;

/** A pill button that opens the bot (or the login page while the bot is not live). */
export const tgButton = (label, payload = "", extra = "") =>
  `<a class="btn btn-tg ${extra}" href="${botUrl(payload)}"${isBotLive() ? ' target="_blank" rel="noopener"' : ""}>${icon("i-plane")}<span>${label}</span></a>`;

export const tgPill = (label) => `<span class="tg-pill"><i>${icon("i-plane")}</i>${label}</span>`;

// A drawn phone showing a morning message from the bot. Purely illustrative, so it is hidden from screen readers.
export const botPhone = () => `
  <div class="tg-phone" aria-hidden="true"><div class="tg-screen">
    <div class="tg-head">${icon("i-mark")}<div><b>${t("tg.botName")}</b><small>${t("tg.botSub")}</small></div></div>
    <div class="tg-msgs">
      <span class="tg-day">${t("tg.today")}</span>
      <div class="tg-bub">${t("tg.msg1")}<br><b>${t("tg.msg1b")}</b><br>${t("tg.msg1c")}<time>07:30</time></div>
      <div class="tg-kb"><span>${t("tg.btnDone")}</span><span>${t("tg.btnLater")}</span><span class="wide">${t("tg.btnLesson")}</span></div>
      <div class="tg-bub me">${t("tg.msgMe")}<time>07:52</time></div>
      <div class="tg-bub">${t("tg.msg2")}<div class="tg-streak">${'<i class="on"></i>'.repeat(6)}<i></i></div>${t("tg.msg2b")}<time>07:52</time></div>
    </div>
  </div></div>`;

const steps = () => tList("tg.steps").map(([title, text], i) =>
  `<li class="tg-step rv d${i}"><span class="k">${i + 1}</span><div><b>${title}</b><p>${text}</p></div></li>`).join("");

/** Home scene: the phone beside the three steps. */
export const telegramScene = () => `
  <section class="sec tg-scene"><div class="wash"></div><div class="wrap tg-grid">
    <div>
      ${tgPill(t("tg.pill"))}
      <h2 class="rv">${t("home.tgA")} <span class="grad">${t("home.tgB")}</span></h2>
      <ol class="tg-steps">${steps()}</ol>
      <div class="ctas-row rv d3">${tgButton(t("home.ctaJoin"), "home")}<a class="lnk" href="#plans"><span>${t("home.allPlans")}</span></a></div>
    </div>
    <div class="tg-stage" data-zoom>${botPhone()}</div>
  </div></section>`;

const planCard = (p) => {
  const items = tList(`plan.${p.id}.items`);
  const price = p.price ? `${ils(p.price)}<small> ${t("plan.perMonth")}</small>` : t("plan.free");
  const cta = p.tone === "tg" ? tgButton(t(`plan.${p.id}.cta`), `plan-${p.id}`, "btn-block") : `<a class="btn btn-ghost btn-block" href="${botUrl(`plan-${p.id}`)}">${t(`plan.${p.id}.cta`)}</a>`;
  return `<div class="plan sub${p.isFeatured ? " hot" : ""}">
    <span class="plan-tag">${p.isFeatured ? t("plan.hot") : t(`plan.${p.id}.tag`)}</span>
    <h3>${t(`plan.${p.id}.name`)}</h3><div class="big num">${price}</div>
    <ul class="incl">${items.map((i) => `<li>${i}</li>`).join("")}</ul>${cta}</div>`;
};

export const plansGrid = () => `<div class="plans subs">${PLANS.map(planCard).join("")}</div>`;

const trackCard = (tr) => `<div class="track rv"><div class="glow" style="background:radial-gradient(80% 70% at 100% 100%,${tr.glow},transparent 70%)"></div>
  <h3>${t(`track.${tr.id}.title`)}</h3><p>${t(`track.${tr.id}.text`)}</p>
  <div class="meta"><span>${t("track.days", { n: tr.days })}</span><span>${t(`track.${tr.id}.meta`)}</span></div></div>`;

export const supportBand = () => `
  <section class="sec" style="padding-top:0"><div class="wrap"><div class="tg-band rv">
    <div><h2>${t("home.supportA")} <span class="grad">${t("home.supportB")}</span></h2><p>${t("home.supportP")}</p></div>
    ${tgButton(t("home.supportCta"), "support")}
  </div></div></section>`;

export function viewPlans() {
  return `<div class="wrap page-head">${tgPill(t("tg.pill"))}<h1 style="margin-top:14px">${t("plans.title")}</h1><p class="muted" style="margin:10px 0 0;max-width:60ch">${t("plans.lead")}</p></div>
  <div class="wrap" style="display:flex;flex-direction:column;gap:70px;padding-bottom:60px">
    ${plansGrid()}
    <div><div class="sec-title"><h2>${t("plans.tracksA")} <span>${t("plans.tracksB")}</span></h2></div><div class="tracks">${TRACKS.map(trackCard).join("")}</div></div>
    <div class="panel"><h2>${t("plans.howTitle")}</h2><ul class="incl">${tList("plans.how").map((x) => `<li>${x}</li>`).join("")}</ul></div>
  </div>`;
}

const ACCOUNT_ICONS = ["i-book", "i-bell", "i-lock", "i-chat"];
const accountPoints = () => tList("login.points").map(([b, p], i) =>
  `<div><span class="ic">${icon(ACCOUNT_ICONS[i])}</span><b>${b}</b><p>${p}</p></div>`).join("");

export function viewLogin() {
  const cells = Array.from({ length: LOGIN_CODE_LENGTH }, (_, i) => `<input${i ? "" : ' id="code0"'} inputmode="numeric" maxlength="1" aria-label="${t("login.digit", { n: i + 1 })}" disabled>`).join("");
  return `<div class="wrap page-head center">${tgPill(t("tg.pill"))}<h1 style="margin-top:14px">${t("login.title")}</h1><p class="muted" style="margin:10px auto 0;max-width:52ch">${t("login.lead")}</p></div>
  <div class="wrap" style="display:flex;flex-direction:column;gap:60px;padding-bottom:60px">
    ${isBotLive() ? "" : `<p class="tg-soon">${t("login.soon")}</p>`}
    <div class="login-grid">
      <div class="login-card"><h3>${t("login.phoneH")}</h3><p class="muted">${t("login.phoneP")}</p>${tgButton(t("login.btn"), "login")}<p class="fine">${t("login.privacy")}</p></div>
      <div class="login-card"><h3>${t("login.deskH")}</h3><p class="muted">${t("login.deskP")}</p>
        <label class="fine" for="code0">${t("login.codeLabel")}</label><div class="code" dir="ltr">${cells}</div>
        <button class="btn btn-ink" disabled>${t("login.verify")}</button><p class="fine">${t("login.codeNote")}</p></div>
    </div>
    <div><div class="sec-title"><h2>${t("login.acctA")} <span>${t("login.acctB")}</span></h2></div><div class="acct">${accountPoints()}</div></div>
  </div>`;
}
