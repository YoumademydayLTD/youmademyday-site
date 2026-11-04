// Standard Webhooks signature check (https://www.standardwebhooks.com), as Polar signs its deliveries.
// Signed content: "<webhook-id>.<webhook-timestamp>.<raw body>", HMAC-SHA256, base64, header "v1,<sig> v1,<sig2>".
import { timingSafeEqual } from "../http/compare.ts";

export const TOLERANCE_SECONDS = 5 * 60; // reject replays older (or newer) than five minutes
const SECRET_PREFIX = "whsec_";
const SIGNATURE_VERSION = "v1";

export interface WebhookHeaders { id: string | null; timestamp: string | null; signature: string | null }
export type VerifyResult = { ok: true } | { ok: false; reason: string };

const decodeBase64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const encoder = new TextEncoder();

/** Key bytes: a "whsec_" secret is base64 after the prefix; any other secret is used as its UTF-8 bytes. */
export function secretKey(secret: string): Uint8Array {
  return secret.startsWith(SECRET_PREFIX) ? decodeBase64(secret.slice(SECRET_PREFIX.length)) : encoder.encode(secret);
}

export async function sign(key: Uint8Array, id: string, timestamp: string, body: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(`${id}.${timestamp}.${body}`)));
  return btoa(String.fromCharCode(...mac));
}

export async function verifyWebhook(headers: WebhookHeaders, body: string, secret: string, nowSeconds: number): Promise<VerifyResult> {
  const { id, timestamp, signature } = headers;
  if (!secret) return { ok: false, reason: "no webhook secret configured" };
  if (!id || !timestamp || !signature) return { ok: false, reason: "missing webhook-id, webhook-timestamp or webhook-signature" };
  const sentAt = Number(timestamp);
  if (!Number.isInteger(sentAt) || Math.abs(nowSeconds - sentAt) > TOLERANCE_SECONDS) return { ok: false, reason: "timestamp outside the tolerance" };
  const expected = encoder.encode(await sign(secretKey(secret), id, timestamp, body));
  const matches = signature.split(" ").some((part) => {
    const [version, value] = part.split(",", 2);
    return version === SIGNATURE_VERSION && value !== undefined && timingSafeEqual(encoder.encode(value), expected);
  });
  return matches ? { ok: true } : { ok: false, reason: "signature mismatch" };
}
