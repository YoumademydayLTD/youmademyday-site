// Browser access to the login API is limited to the store's own origin (and the local preview). Pure, so it is unit-tested.
export interface CorsConfig { siteUrl: string; extraOrigins: string }

export function allowedOrigins(config: CorsConfig): Set<string> {
  const extra = config.extraOrigins.split(",").map((o) => o.trim()).filter(Boolean);
  return new Set([new URL(config.siteUrl).origin, ...extra]);
}

export function corsHeaders(origin: string | null, allowed: Set<string>): Record<string, string> {
  if (!origin || !allowed.has(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    // The site sends its session as a bearer token (it lives in localStorage under "ymd-session").
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
