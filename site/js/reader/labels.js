// Words and small pieces shared by the reader's list page and its unit page. A course counts lessons,
// a book or template counts chapters, so every label is looked up by the item's kind.
import { esc } from "../util.js";
import { t } from "../i18n/index.js";

/** «Lesson 3» or «Chapter 3». */
export const unitName = (kind, n) => t(`read.unit.${kind}`, { n });

/** A unit's own title, or its number when the title is missing. */
export const unitTitle = (kind, unit) => (unit.title ? esc(unit.title) : unitName(kind, unit.n));

/** «2 of 8 lessons done» (plain text, safe for textContent). */
export const progressText = (kind, done, total) => t(`read.progress.${kind}`, { done, total });

/** The progress line: a bar for the eye and the same words for everyone. */
export const progressLine = (kind, done, total) => `<div class="read-progress">
    <progress max="${Math.max(total, 1)}" value="${Math.min(done, total)}" aria-hidden="true"></progress>
    <span class="read-count">${progressText(kind, done, total)}</span></div>`;

/** The breadcrumb back to the library, and to the item's list page when given. */
export function crumbs(listLink = "") {
  return `<nav class="crumbs read-crumbs" aria-label="breadcrumb"><a href="#account">${t("acct.libraryH")}</a>${listLink ? ` / ${listLink}` : ""}</nav>`;
}
