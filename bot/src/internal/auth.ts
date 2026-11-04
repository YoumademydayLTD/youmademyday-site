// Calls between our own workers (store ↔ bot) carry a shared secret in X-Internal-Secret (YMD_INTERNAL_SECRET).
import { HttpError } from "../http/errors.ts";
import { timingSafeEqualText } from "../http/crypto.ts";

export const INTERNAL_HEADER = "X-Internal-Secret";

export function assertInternal(request: Request, secret: string): void {
  const sent = request.headers.get(INTERNAL_HEADER) ?? "";
  if (!secret || !timingSafeEqualText(sent, secret)) throw new HttpError("unauthorized", "internal call without the right secret");
}
