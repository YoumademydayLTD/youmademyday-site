// Which catalogue items a running membership opens, from the plan descriptions on the site (ui.js plan.<id>.items,
// owner copy of 04.11.2026): Growth and Maximum include every course and book; Companion and Mentor every course.
// Good Day's "one e-book each month" is chosen by hand, so it opens nothing automatically.
// The editing studio (owner, 05.11.2026) opens the photography and editing items its blurb names.
import type { Catalog } from "../catalog/index.ts";

type Scope = "all" | "courses";
const PLAN_SCOPE: Record<string, Scope> = { grow: "all", max: "all", community: "courses", mentor: "courses" };
// Plans that open a fixed list of items instead of a whole scope (only those the catalogue has are opened).
const PLAN_ITEMS: Record<string, readonly string[]> = { edit: ["c5", "c2", "b28", "b29"] };
// Statuses in which a membership gives access (Polar's).
export const RUNNING_STATUSES = new Set(["active", "trialing"]);

export function includedProducts(planIds: string[], catalog: Catalog): Set<string> {
  const scopes = new Set(planIds.flatMap((id) => (PLAN_SCOPE[id] ? [PLAN_SCOPE[id]] : [])));
  const named = new Set(planIds.flatMap((id) => PLAN_ITEMS[id] ?? []));
  const ids = Object.entries(catalog.products).filter(([id, p]) => !p.includes && (scopes.has("all") || (scopes.has("courses") && p.type === "course") || named.has(id)));
  return new Set(ids.map(([id]) => id));
}
