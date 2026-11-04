// Which billing country to prefill on Polar's page (pure). Owner, 04.11.2026: the customer's saved country,
// else the visitor's location (Cloudflare), else the site language (Hebrew → Israel).
const ISO2 = /^[A-Z]{2}$/;
// Cloudflare's codes for "unknown" and "Tor", which are not countries.
const NOT_COUNTRIES = new Set(["XX", "T1"]);
const COUNTRY_BY_LANG: Record<string, string> = { he: "IL" };

export const isCountry = (value: unknown): value is string => typeof value === "string" && ISO2.test(value) && !NOT_COUNTRIES.has(value);

export function chooseCountry(sources: { saved?: string | null; located?: unknown; lang?: string | null }): string | null {
  if (isCountry(sources.saved)) return sources.saved;
  if (isCountry(sources.located)) return sources.located;
  return (sources.lang && COUNTRY_BY_LANG[sources.lang]) || null;
}

/** The visitor's country and IP as Cloudflare sees them. */
export function visitorOf(request: Request): { country: unknown; ip: string | null } {
  const cf = (request as Request & { cf?: { country?: unknown } }).cf;
  return { country: cf?.country, ip: request.headers.get("CF-Connecting-IP") };
}
