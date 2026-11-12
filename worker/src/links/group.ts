// A link for «one product of a group» (pure): which group the caller asked for, and which product the buyer gets.
import { HttpError } from "../http/errors.ts";
import { LINK_GROUPS, linkGroupOf } from "../catalog/link-groups.ts";

const MAX_GROUP_LENGTH = 40;

export interface LinkGroup { name: string; ids: readonly string[] }

/** The group a request names in `product_group`, if any. A request names a product or a group, never both. */
export function parseLinkGroup(body: Record<string, unknown>): LinkGroup | null {
  const name = body.product_group;
  if (name === undefined || name === null) return null;
  if (body.product !== undefined && body.product !== null) throw new HttpError("bad_request", "send product or product_group, not both");
  const ids = typeof name === "string" && name.length <= MAX_GROUP_LENGTH ? linkGroupOf(name) : null;
  if (!ids || ids.length === 0) throw new HttpError("unknown_item", `product_group must be one of: ${Object.keys(LINK_GROUPS).join(", ")}`);
  return { name: name as string, ids };
}

/**
 * The product a group link sells: the first one the buyer does not own yet, in catalogue order. When he owns them all,
 * or the store does not know him, any of them, chosen by `turn` (the caller passes the time, so repeats move on).
 * Owner, 12.11.2026: buying a product the account already has is allowed, so a full shelf never blocks the sale.
 */
export function pickFromGroup(ids: readonly string[], owned: ReadonlySet<string> | null, turn: number): string {
  const fresh = owned ? ids.find((id) => !owned.has(id)) : undefined;
  if (fresh !== undefined) return fresh;
  const picked = ids[Math.abs(Math.trunc(turn)) % ids.length];
  if (picked === undefined) throw new Error("pickFromGroup needs a group with at least one product");
  return picked;
}
