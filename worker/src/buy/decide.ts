// What GET /buy/:slug answers (pure), from the slug, the User-Agent and the stay-here flag.
import { browserKindOf, isLinkPreview, type BrowserKind } from "../go/browser.ts";
import { reusableLinkOf, type ReusableLink } from "./slugs.ts";

export type BuyDecision =
  | { action: "missing" }
  // A link preview (Instagram, Telegram, WhatsApp) gets a plain page: a fetch that nobody pays on opens no checkout.
  | { action: "preview" }
  | { action: "bounce"; kind: Exclude<BrowserKind, "browser">; link: ReusableLink }
  | { action: "checkout"; link: ReusableLink };

export interface BuyQuery { slug: string; userAgent: string | null; isStay: boolean }

export function decideBuy({ slug, userAgent, isStay }: BuyQuery): BuyDecision {
  const link = reusableLinkOf(slug);
  if (!link) return { action: "missing" };
  if (isLinkPreview(userAgent)) return { action: "preview" };
  const kind = browserKindOf(userAgent);
  if (kind === "browser" || isStay) return { action: "checkout", link };
  return { action: "bounce", kind, link };
}
