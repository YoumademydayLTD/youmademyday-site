// Random tokens, hashes and constant-time comparison (Web Crypto only).
const encoder = new TextEncoder();

export function timingSafeEqualText(a: string, b: string): boolean {
  const x = encoder.encode(a);
  const y = encoder.encode(b);
  if (x.byteLength !== y.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < x.byteLength; i += 1) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

const toBase64Url = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** A URL-safe random token; 24 bytes give 32 characters, short enough for a Telegram start payload. */
export function randomToken(bytes = 24): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

const DECIMAL = 10;
// The largest multiple of 10 under 256: bytes above it would favour the low digits.
const UNBIASED_LIMIT = 250;
/** A random string of decimal digits without modulo bias. */
export function randomDigits(length: number): string {
  let out = "";
  while (out.length < length) {
    const byte = crypto.getRandomValues(new Uint8Array(1))[0] ?? 0;
    if (byte < UNBIASED_LIMIT) out += String(byte % DECIMAL);
  }
  return out;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}
