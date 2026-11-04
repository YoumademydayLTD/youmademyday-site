// Joining a track, for a visitor who has none yet. Spark is free; the topic tracks need an active membership,
// so for those the page points to the memberships instead of offering a button that would be refused.
import { esc } from "../util.js";
import { t } from "../i18n/index.js";
import { trackName } from "./today.js";

function trackOption(track) {
  const name = trackName(track.id);
  const textKey = `track.${track.id}.text`;
  const text = t(textKey) === textKey ? "" : `<p class="muted">${t(textKey)}</p>`;
  const action = track.canJoin
    ? `<button class="btn btn-ink btn-sm" type="button" data-act="comp-join" data-track="${esc(track.id)}" aria-label="${t("comp.joinLabel", { name })}">${t("comp.join")}</button>`
    : `<span class="tag">${t("comp.membersOnly")}</span>`;
  const free = track.isFree ? ` <span class="tag tag-ok">${t("plan.spark.tag")}</span>` : "";
  return `<li class="me-card comp-option"><div class="me-head"><h3>${name}${free}</h3>${action}</div>${text}</li>`;
}

/** The track list (on the companion page), or a short pointer to it (in the personal area). */
export function joinBlock(tracks, isBrief) {
  if (isBrief) return `<p class="muted">${t("comp.noTrack")}</p><a class="lnk" href="#companion"><span>${t("comp.choose")}</span></a>`;
  const plansLink = tracks.some((tr) => !tr.canJoin) ? `<a class="lnk" href="#plans"><span>${t("home.allPlans")}</span></a>` : "";
  return `<p>${t("comp.joinLead")}</p><ul class="me-list">${tracks.map(trackOption).join("")}</ul>${plansLink}`;
}
