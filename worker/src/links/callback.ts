// Optional push to CRX when one of its links changes (paid, trial started, renewed, cancelled, refunded).
// Set CRX_STATUS_CALLBACK_URL to turn it on; GET /api/links/:id/status stays the source of truth.
// Signature: X-YMD-Signature = "sha256=" + hex(HMAC-SHA256(YMD_LINKS_SECRET, "<X-YMD-Timestamp>.<raw body>")).
import type { Env } from "../env.ts";
import { hmacSha256 } from "../http/hmac.ts";
import { PRODUCT_MAP } from "../polar/mapping.ts";
import { readLinkStatus, type LinkStatus } from "./status.ts";

export const SIGNATURE_HEADER = "X-YMD-Signature";
export const TIMESTAMP_HEADER = "X-YMD-Timestamp";
const SIGNATURE_PREFIX = "sha256=";
const MS_PER_SECOND = 1000;
const ERROR_BODY_CHARS = 200;

const toHex = (bytes: Uint8Array): string => [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function signCallback(secret: string, timestamp: string, body: string): Promise<string> {
  return `${SIGNATURE_PREFIX}${toHex(await hmacSha256(new TextEncoder().encode(secret), `${timestamp}.${body}`))}`;
}

export interface CallbackTarget { url: string; secret: string; fetcher?: typeof fetch }

/** POSTs one status to CRX; throws on a network error or a non-2xx reply. */
export async function postLinkStatus(target: CallbackTarget, status: LinkStatus, now: Date): Promise<void> {
  const body = JSON.stringify(status);
  const timestamp = String(Math.floor(now.getTime() / MS_PER_SECOND));
  const response = await (target.fetcher ?? fetch)(target.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", [TIMESTAMP_HEADER]: timestamp, [SIGNATURE_HEADER]: await signCallback(target.secret, timestamp, body) },
    body,
  });
  if (!response.ok) throw new Error(`CRX callback ${response.status}: ${(await response.text()).slice(0, ERROR_BODY_CHARS)}`);
}

/** After a webhook updated the tables: tell CRX the new status of its link, if this checkout is one. Never throws. */
export async function pushLinkStatus(env: Env, checkoutId: string | null, now: Date): Promise<void> {
  if (!checkoutId || !env.CRX_STATUS_CALLBACK_URL || !env.YMD_LINKS_SECRET) return;
  try {
    const status = await readLinkStatus(env.DB, checkoutId, PRODUCT_MAP);
    if (status) await postLinkStatus({ url: env.CRX_STATUS_CALLBACK_URL, secret: env.YMD_LINKS_SECRET }, status, now);
  } catch (error) {
    // CRX can always read GET /api/links/:id/status, so a failed push is logged, not retried.
    console.error("links: CRX callback failed", checkoutId, error instanceof Error ? error.message : String(error));
  }
}
