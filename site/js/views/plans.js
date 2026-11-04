// Memberships: the two weekly plans (the main offer), the smaller monthly plans, topic tracks,
// and the plans page that puts them together.
import { t, tList } from "../i18n/index.js";
import { FEATURED_PLANS, PLANS, TRACKS } from "../telegram/plans.js";
import { priceLabel, buyHref } from "../money.js";
import { tgButton, tgPill } from "./telegram.js";

const list = (key) => `<ul class="incl">${tList(key).map((i) => `<li>${i}</li>`).join("")}</ul>`;
const per = (p) => t(p.period === "week" ? "plan.perWeek" : "plan.perMonth");

// Paid plans are paid on the site; the free channel opens straight in the bot.
const planCta = (p, extra = "") => p.price
  ? `<a class="btn ${p.isFeatured ? "btn-tg" : "btn-ink"} btn-block ${extra}" href="${buyHref(`plan-${p.id}`)}">${t(`plan.${p.id}.cta`)}</a>`
  : tgButton(t(`plan.${p.id}.cta`), `plan-${p.id}`, "btn-block");

/** A big weekly plan tile, in the style of the home tiles. */
const featuredCard = (p) => `
  <div class="feat${p.isFeatured ? " dark" : ""} rv">
    <div class="glow"></div>
    <span class="plan-tag">${t(p.isFeatured ? "plan.hot" : `plan.${p.id}.tag`)}</span>
    <h3>${t(`plan.${p.id}.name`)}</h3>
    <p class="feat-sub">${t(`plan.${p.id}.sub`)}</p>
    <div class="feat-price num">${priceLabel(p)}<small> ${per(p)}</small></div>
    <p class="feat-trial">${t("plan.trial", { days: p.trialDays })}</p>
    ${list(`plan.${p.id}.items`)}
    ${planCta(p, "btn-lg")}
    <p class="fine">${t("plan.renewNote", { price: priceLabel(p), per: per(p) })}</p>
  </div>`;

export const featuredPlans = () => `<div class="feats">${FEATURED_PLANS.map(featuredCard).join("")}</div>`;

const planCard = (p) => `<div class="plan sub${p.isFeatured ? " hot" : ""}">
    <span class="plan-tag">${p.isFeatured ? t("plan.hot") : t(`plan.${p.id}.tag`)}</span>
    <h3>${t(`plan.${p.id}.name`)}</h3><div class="big num">${p.price ? `${priceLabel(p)}<small> ${per(p)}</small>` : t("plan.free")}</div>
    ${list(`plan.${p.id}.items`)}${planCta(p)}</div>`;

export const plansGrid = () => `<div class="plans subs">${PLANS.map(planCard).join("")}</div>`;

const trackCard = (tr) => `<div class="track rv"><div class="glow" style="background:radial-gradient(80% 70% at 100% 100%,${tr.glow},transparent 70%)"></div>
  <h3>${t(`track.${tr.id}.title`)}</h3><p>${t(`track.${tr.id}.text`)}</p>
  <div class="meta"><span>${t("track.days", { n: tr.days })}</span><span>${t(`track.${tr.id}.meta`)}</span></div></div>`;

export function viewPlans() {
  return `<div class="wrap page-head">${tgPill(t("tg.pill"))}<h1 style="margin-top:14px">${t("plans.title")}</h1><p class="muted" style="margin:10px 0 0;max-width:60ch">${t("plans.lead")}</p></div>
  <div class="wrap" style="display:flex;flex-direction:column;gap:70px;padding-bottom:60px">
    ${featuredPlans()}
    <div><div class="sec-title"><h2>${t("plans.moreA")} <span>${t("plans.moreB")}</span></h2></div>${plansGrid()}</div>
    <div><div class="sec-title"><h2>${t("plans.tracksA")} <span>${t("plans.tracksB")}</span></h2></div><div class="tracks">${TRACKS.map(trackCard).join("")}</div></div>
    <div class="panel"><h2>${t("plans.howTitle")}</h2>${list("plans.how")}</div>
  </div>`;
}
