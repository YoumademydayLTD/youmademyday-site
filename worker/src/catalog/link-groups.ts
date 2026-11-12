// Groups of interchangeable one-time products a link may ask for by group instead of by id (POST /api/links
// `product_group`). Owner, 12.11.2026: the one-dollar short guides are bought through links again and again, and the
// caller should not need to know the catalogue, so it asks for «a short guide» and the store picks which.
const FIRST_SHORT_GUIDE = 53;
const SHORT_GUIDE_COUNT = 24; // b53–b76, category «מדריכים קצרים» in content/catalog.json

export const LINK_GROUPS: Readonly<Record<string, readonly string[]>> = {
  "short-guide": Array.from({ length: SHORT_GUIDE_COUNT }, (_, i) => `b${FIRST_SHORT_GUIDE + i}`),
};

/** The products of a group; null for any name not in the table (never an inherited key like "constructor"). */
export const linkGroupOf = (name: string): readonly string[] | null => (Object.hasOwn(LINK_GROUPS, name) ? LINK_GROUPS[name] ?? null : null);
