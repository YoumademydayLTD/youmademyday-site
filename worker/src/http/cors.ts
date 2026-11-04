// Browser access is limited to the store's own origin (and the local preview). Pure, so it is unit-tested.

export interface CorsConfig { siteUrl: string; extraOrigins: string }

export function allowedOrigins(config: CorsConfig): Set<string> {
  const extra = config.extraOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  return new Set([new URL(config.siteUrl).origin, ...extra]);
}

/** True when a request may proceed: no Origin (server-to-server) or one of ours. */
export const isOriginAllowed = (origin: string | null, allowed: Set<string>): boolean => origin === null || allowed.has(origin);

export function corsHeaders(origin: string | null, allowed: Set<string>): Record<string, string> {
  if (!origin || !allowed.has(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
