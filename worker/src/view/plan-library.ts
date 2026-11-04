// Which catalogue items a running membership opens, from the plan descriptions on the site (ui.js plan.<id>.items,
// owner copy of 04.11.2026): Growth and Maximum include every course and book; Companion and Mentor every course.
// Good Day's "one e-book each month" is chosen by hand, so it opens nothing automatically.
import type { Catalog } from "../catalog/index.ts";

type Scope = "all" | "courses";
const PLAN_SCOPE: Record<string, Scope> = { grow: "all", max: "all", community: "courses", mentor: "courses" };
// Statuses in which a membership gives access (Polar's).
export const RUNNING_STATUSES = new Set(["active", "trialing"]);

export function includedProducts(planIds: string[], catalog: Catalog): Set<string> {
  const scopes = new Set(planIds.flatMap((id) => (PLAN_SCOPE[id] ? [PLAN_SCOPE[id]] : [])));
  const ids = Object.entries(catalog.products).filter(([, p]) => !p.includes && (scopes.has("all") || (scopes.has("courses") && p.type === "course")));
  return new Set(ids.map(([id]) => id));
}
