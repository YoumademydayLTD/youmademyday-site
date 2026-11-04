// Constant-time comparison, so a wrong secret or signature takes as long to reject as a nearly-right one.

export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

const encoder = new TextEncoder();
export const timingSafeEqualText = (a: string, b: string): boolean => timingSafeEqual(encoder.encode(a), encoder.encode(b));
