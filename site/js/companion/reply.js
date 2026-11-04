// Pure rules for the daily companion: the bot worker's reply becomes one fixed shape (a missing field never
// breaks the page), past days are listed newest first, and the reminder hours are named for people.
// No DOM, no dictionary, so it is unit tested.

export const HOURS_PER_DAY = 24;
const DEFAULT_HOUR = 8; // the bot's own default reminder hour, used only when the reply leaves it out
const REFERENCE_YEAR = 2000; // any fixed day: only the hour of it is shown

const asList = (value) => (Array.isArray(value) ? value : []);
const asText = (value) => (typeof value === "string" ? value : "");
const asCount = (value) => (Number.isInteger(value) && value >= 0 ? value : 0);
const isHour = (value) => Number.isInteger(value) && value >= 0 && value < HOURS_PER_DAY;
const isDay = (entry) => Number.isInteger(entry?.dayN) && typeof entry.text === "string";

/** A link from the reply is followed only when it is https or a page of this site. */
export function safeHref(url) {
  if (typeof url !== "string") return null;
  return /^https:\/\//i.test(url) || /^[#/](?!\/)/.test(url) ? url : null;
}

function todayOf(value) {
  if (!isDay(value)) return null;
  const lessonUrl = safeHref(value.lessonUrl);
  return { dayN: value.dayN, text: value.text, lessonUrl, lessonLabel: lessonUrl ? asText(value.lessonLabel) : "" };
}

function settingsOf(value) {
  return {
    dailyHour: isHour(value?.dailyHour) ? value.dailyHour : DEFAULT_HOUR,
    timeZone: asText(value?.timeZone),
    paused: value?.paused === true,
    silent: value?.silent === true,
  };
}

/** Past days, newest first, without broken entries. */
export const newestFirst = (history) => asList(history).filter(isDay).sort((a, b) => b.dayN - a.dayN);

/** GET /api/companion (and POST …/track) → the companion as the page shows it. */
export function companionOf(data) {
  return {
    track: asText(data.track) || null,
    tracks: asList(data.tracks).filter((tr) => typeof tr?.id === "string")
      .map((tr) => ({ id: tr.id, isFree: tr.isFree === true, canJoin: tr.canJoin === true })),
    today: todayOf(data.today),
    history: newestFirst(data.history),
    streak: asCount(data.streak),
    doneToday: data.doneToday === true,
    settings: settingsOf(data.settings),
  };
}

/** POST …/settings → the saved settings. */
export const settingsReplyOf = (data) => settingsOf(data.settings);

/** POST …/done → { streak, doneToday }. */
export const doneReplyOf = (data) => ({ streak: asCount(data.streak), doneToday: data.doneToday === true });

/** «08:00» for hour 8, in the visitor's own clock style. */
export function formatHour(hour, locale) {
  const format = new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
  return format.format(Date.UTC(REFERENCE_YEAR, 0, 1, hour));
}
