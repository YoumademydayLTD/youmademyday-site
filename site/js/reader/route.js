// Addresses of the reader: #read-<item id> is a course's lesson list (or a book's chapters) and
// #read-<item id>-<n> is one lesson or chapter. Pure, so it is unit tested.

export const READ_PREFIX = "read-";
// Item ids are a letter and digits (c2, b14, k3); units count from 1.
const READ_ROUTE = /^([a-z]\d+)(?:-([1-9]\d*))?$/;

/** { id, n } for the part after the prefix (n is null on the list page), or null for an address that is not one. */
export function parseReadRoute(rest) {
  const match = READ_ROUTE.exec(rest);
  if (!match) return null;
  return { id: match[1], n: match[2] === undefined ? null : Number(match[2]) };
}

/** The route (no "#") of an item's list page, or of one of its units. */
export const readRoute = (id, n = null) => `${READ_PREFIX}${id}${n === null ? "" : `-${n}`}`;

/** The link to an item's list page, or to one of its units. */
export const readHref = (id, n = null) => `#${readRoute(id, n)}`;
