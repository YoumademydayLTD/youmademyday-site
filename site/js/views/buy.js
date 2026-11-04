// Single-item checkout for direct offers (the flagship book) and memberships: one item, one price,
// one currency. Each kind opens by its switch in checkout/config.js; while off, the page says it opens soon.
import { ALL } from "../catalog.js";
import { ALL_PLANS } from "../telegram/plans.js";
import { flatCover } from "../book3d.js";
import { esc } from "../util.js";
import { t, tList } from "../i18n/index.js";
import { payPanel, payButton } from "../checkout/panel.js";
import { priceLabel } from "../money.js";

const PLAN_PREFIX = "plan-";

/** The product or plan a #buy-<id> page sells, or null for an unknown id. */
export function buyTarget(id) {
  if (id.startsWith(PLAN_PREFIX)) {
    const plan = ALL_PLANS[id.slice(PLAN_PREFIX.length)];
    return plan && plan.price ? { kind: "plan", item: plan } : null;
  }
  return ALL[id] ? { kind: "product", item: ALL[id] } : null;
}

function planLine(plan) {
  const name = t(`plan.${plan.id}.name`);
  const per = t(plan.period === "week" ? "plan.perWeek" : "plan.perMonth");
  const today = plan.trialDays ? t("buy.trialToday", { days: plan.trialDays }) : priceLabel(plan);
  return `<div class="line"><div class="plan-chip">${name.slice(0, 1)}</div><div style="min-width:0"><h4>${t("buy.planTitle", { name })}</h4><small>${priceLabel(plan)} ${per}</small></div><b class="num">${today}</b></div>`;
}

const productLine = (p) => `<div class="line">${flatCover(p)}<div style="min-width:0"><h4>${esc(p.title)}</h4><small>${esc(p.sub)}</small></div><b class="num">${priceLabel(p)}</b></div>`;

export function viewBuy(id) {
  const target = buyTarget(id);
  if (!target) return `<div class="wrap success"><h1>${t("checkout.emptyTitle")}</h1><a class="btn btn-ink" href="#plans">${t("home.allPlans")}</a></div>`;
  const isPlan = target.kind === "plan";
  const points = tList(isPlan ? "buy.planPoints" : "checkout.points").map((x) => x.replace("{price}", priceLabel(target.item)));
  return `<div class="wrap page-head"><h1>${t("checkout.title")}</h1></div>
  <div class="wrap checkout">
    ${payPanel(target.kind, points)}
    <aside class="buybox"><h2 style="margin:0;font-size:22px">${t("checkout.order")}</h2>
      ${isPlan ? planLine(target.item) : productLine(target.item)}
      <div class="sum total"><span>${t("buy.today")}</span><span class="num">${isPlan && target.item.trialDays ? t("plan.free") : priceLabel(target.item)}</span></div>
      ${payButton(target.kind, target.item.id)}
    </aside>
  </div>`;
}
