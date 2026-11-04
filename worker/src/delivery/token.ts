// Short-lived signed download links: "<payload>.<signature>", both base64url, HMAC-SHA256 over the payload.
import { timingSafeEqual } from "../http/compare.ts";
import { fromBase64Url, hmacSha256, toBase64Url } from "../http/hmac.ts";

export interface FileClaim { key: string; filename: string; exp: number } // exp: unix seconds
export const FILE_LINK_TTL_SECONDS = 30 * 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function createFileToken(claim: FileClaim, secret: string): Promise<string> {
  const payload = toBase64Url(encoder.encode(JSON.stringify(claim)));
  return `${payload}.${toBase64Url(await hmacSha256(encoder.encode(secret), payload))}`;
}

function parseClaim(payload: string): FileClaim | null {
  try {
    const value: unknown = JSON.parse(decoder.decode(fromBase64Url(payload)));
    if (typeof value !== "object" || value === null) return null;
    const { key, filename, exp } = value as Record<string, unknown>;
    return typeof key === "string" && typeof filename === "string" && typeof exp === "number" ? { key, filename, exp } : null;
  } catch {
    return null;
  }
}

/** The claim of a valid, unexpired token, else null. */
export async function verifyFileToken(token: string, secret: string, nowSeconds: number): Promise<FileClaim | null> {
  if (!secret) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = toBase64Url(await hmacSha256(encoder.encode(secret), payload));
  if (!timingSafeEqual(encoder.encode(signature), encoder.encode(expected))) return null;
  const claim = parseClaim(payload);
  return claim && claim.exp > nowSeconds ? claim : null;
}
