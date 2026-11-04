// Today in the daily companion: the track, today's message (plain text, line breaks kept by CSS), the link to
// today's lesson when there is one, the «✓ Done» button (the same as the bot's) and the streak.
import { esc } from "../util.js";
import { t, L } from "../i18n/index.js";
import { formatHour } from "./reply.js";

export const TODAY_ID = "compToday";

/** A track's name in this language (track.<id>.title), or its id when the dictionary has none. */
export function trackName(id) {
  const key = `track.${id}.title`;
  const name = t(key);
  return name === key ? esc(id) : name;
}

function lessonLink(today) {
  if (!today.lessonUrl) return "";
  const isExternal = /^https:/i.test(today.lessonUrl);
  const target = isExternal ? ' target="_blank" rel="noopener"' : "";
  return `<a class="lnk" href="${esc(today.lessonUrl)}"${target}><span>${today.lessonLabel ? esc(today.lessonLabel) : t("comp.lesson")}</span></a>`;
}

function doneControl(data) {
  if (data.doneToday) return `<span class="tag tag-ok">${t("comp.doneToday")}</span>`;
  return `<button class="btn btn-ink btn-sm" type="button" data-act="comp-done">${t("comp.doneBtn")}</button>`;
}

function message(data) {
  const { today, settings } = data;
  if (!today) {
    const note = settings.paused ? t("comp.pausedNote") : t("comp.todayLater", { time: formatHour(settings.dailyHour, L.locale) });
    return `<p class="muted">${note}</p>`;
  }
  return `<article class="comp-today" aria-labelledby="compDayH">
      <h3 id="compDayH" tabindex="-1">${t("comp.day", { n: today.dayN })}</h3>
      <p class="comp-text" dir="auto">${esc(today.text)}</p>${lessonLink(today)}</article>
    <div class="comp-done">${doneControl(data)}</div>`;
}

/** Markup of the inside of the «today» box (redrawn on its own after «done» or a pause). */
export function todayInner(data) {
  const paused = data.settings.paused ? `<span class="tag">${t("comp.pausedTag")}</span>` : "";
  return `<div class="comp-line"><span class="tag tag-plan">${trackName(data.track)}</span>${paused}
      <span class="comp-streak">${t("comp.streak", { n: data.streak })}</span></div>
    ${message(data)}`;
}

export const todayBlock = (data) => `<div class="comp-block" id="${TODAY_ID}">${todayInner(data)}</div>`;
