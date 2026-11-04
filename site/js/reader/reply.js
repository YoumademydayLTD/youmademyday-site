// Pure rules for the reader: the payment worker's replies become one fixed shape (a missing field never breaks
// the page), and which unit «continue» opens. No DOM, no dictionary, so it is unit tested.

const asList = (value) => (Array.isArray(value) ? value : []);
const asCount = (value) => (Number.isInteger(value) && value >= 0 ? value : 0);
const asText = (value) => (typeof value === "string" ? value : "");
const asMinutes = (value) => (typeof value === "number" && value > 0 ? Math.round(value) : null);
const isUnitNumber = (value) => Number.isInteger(value) && value > 0;

/** A course is read in lessons (with minutes); everything else (books, templates) in chapters. */
const kindOf = (value) => (value === "course" ? "course" : "book");

/** The previous or next unit: the worker may send its number or { n, title }. */
export function unitRefOf(value) {
  if (isUnitNumber(value)) return { n: value, title: "" };
  if (isUnitNumber(value?.n)) return { n: value.n, title: asText(value.title) };
  return null;
}

/** GET /api/read/<id> → { id, kind, title, lang, units: [{ n, title, minutes, done }], done, total }. */
export function itemOf(data) {
  const units = asList(data.units).filter((u) => isUnitNumber(u?.n))
    .map((u) => ({ n: u.n, title: asText(u.title), minutes: asMinutes(u.minutes), done: u.done === true }));
  return {
    id: asText(data.id), kind: kindOf(data.kind), title: asText(data.title), lang: asText(data.lang) || null,
    units, done: asCount(data.done), total: asCount(data.total) || units.length,
  };
}

/** GET /api/read/<id>/<n> → the unit with its body, neighbours and the item's progress. */
export function unitOf(data) {
  return {
    id: asText(data.id), kind: kindOf(data.kind), n: isUnitNumber(data.n) ? data.n : 1, title: asText(data.title),
    minutes: asMinutes(data.minutes), html: asText(data.html), prev: unitRefOf(data.prev), next: unitRefOf(data.next),
    done: data.done === true, doneCount: asCount(data.doneCount), total: asCount(data.total),
  };
}

/** POST …/done → { done, doneCount, total }. */
export const doneStateOf = (data) => ({ done: data.done === true, doneCount: asCount(data.doneCount), total: asCount(data.total) });

/**
 * The unit «continue» opens: the one last open in this browser when it still exists, else the first one not
 * done yet, else the first. null for an item without units.
 */
export function nextUnitToOpen(units, lastN) {
  if (lastN !== null && units.some((u) => u.n === lastN)) return lastN;
  return (units.find((u) => !u.done) ?? units[0])?.n ?? null;
}
