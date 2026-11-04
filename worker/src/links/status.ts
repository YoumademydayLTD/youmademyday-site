// A CRX link's status from the store's tables (the webhook keeps them current).
import type { ProductMap } from "../polar/mapping.ts";
import { findLinkFacts } from "../db/links.ts";
import { linkStatus, type LinkStatus } from "./link-status.ts";

export type { LinkStatus } from "./link-status.ts";

export async function readLinkStatus(db: D1Database, checkoutId: string, map: ProductMap): Promise<LinkStatus | null> {
  const facts = await findLinkFacts(db, checkoutId);
  return facts ? linkStatus(facts, map) : null;
}
