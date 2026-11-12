// The shared bearer secret of the link endpoints (YMD_LINKS_SECRET): server-to-server callers only.
import { HttpError } from "../http/errors.ts";
import { timingSafeEqualText } from "../http/compare.ts";

const BEARER = "Bearer ";

export function assertAuthorized(header: string | null, secret: string): void {
  // An unset secret must never let everyone in.
  if (!secret || !header?.startsWith(BEARER) || !timingSafeEqualText(header.slice(BEARER.length), secret)) {
    throw new HttpError("unauthorized", "missing or wrong Authorization: Bearer <secret>");
  }
}
