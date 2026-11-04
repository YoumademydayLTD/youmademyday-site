// Past days of the daily companion, newest first, folded away until opened: one fold for the whole list, and
// one per day, so a long history never pushes the settings out of reach.
import { esc } from "../util.js";
import { t } from "../i18n/index.js";

const dayItem = (day) => `<li><details class="comp-day"><summary>${t("comp.day", { n: day.dayN })}</summary>
    <p class="comp-text" dir="auto">${esc(day.text)}</p></details></li>`;

export function historyBlock(history) {
  if (!history.length) return "";
  return `<details class="comp-history"><summary>${t("comp.history", { n: history.length })}</summary>
      <ol class="comp-days">${history.map(dayItem).join("")}</ol></details>`;
}
