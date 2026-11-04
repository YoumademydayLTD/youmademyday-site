// The morning message as on the site's phone scene: the text, «✓ done», «remind me tonight», and the lesson
// button when the day has one.
import type { Lang } from "../config/langs.ts";
import type { ContentItem } from "../content/repo.ts";
import { t } from "../i18n/index.ts";
import { button, link } from "../menu/keyboards.ts";
import type { InlineKeyboard } from "../telegram/types.ts";

export const doneData = (track: string, day: number): string => `done:${track}:${day}`;
export const laterData = (track: string, day: number): string => `later:${track}:${day}`;

export function dailyKeyboard(lang: Lang, content: ContentItem, withLater: boolean): InlineKeyboard {
  const first = [button(t(lang, "btnDone"), doneData(content.track, content.dayN))];
  if (withLater) first.push(button(t(lang, "btnLater"), laterData(content.track, content.dayN)));
  const rows = [first];
  if (content.lessonUrl) rows.push([link(content.lessonLabel || t(lang, "btnLesson"), content.lessonUrl)]);
  return { inline_keyboard: rows };
}

/** «done:<track>:<day>» / «later:<track>:<day>» back into parts. */
export function parseDayData(data: string): { track: string; day: number } | null {
  const [, track, day] = data.split(":");
  const n = Number(day);
  return track && Number.isInteger(n) && n > 0 ? { track, day: n } : null;
}
