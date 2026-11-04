// The /start payloads the site's buttons send (pure). Telegram allows 1–64 characters from [A-Za-z0-9_-].
export type StartPayload =
  | { kind: "menu" }
  | { kind: "home" }
  | { kind: "support" }
  | { kind: "login"; token: string }
  | { kind: "plan"; planId: string }
  | { kind: "order"; checkoutId: string };

export const MAX_PAYLOAD_LENGTH = 64;
const SAFE = /^[A-Za-z0-9_-]+$/;
const CHECKOUT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LOGIN_TOKEN = /^[A-Za-z0-9_-]{16,48}$/;
const PLAN_ID = /^[a-z]{2,20}$/;

/** The payload of a "/start <payload>" message text; anything unknown is the plain menu. */
export function parseStartText(text: string): StartPayload {
  const [command, payload = ""] = text.trim().split(/\s+/, 2);
  if (!command?.startsWith("/start")) return { kind: "menu" };
  return parsePayload(payload);
}

export function parsePayload(payload: string): StartPayload {
  if (!payload || payload.length > MAX_PAYLOAD_LENGTH || !SAFE.test(payload)) return { kind: "menu" };
  if (payload === "home") return { kind: "home" };
  if (payload === "support") return { kind: "support" };
  const [prefix, ...rest] = payload.split("-");
  const value = rest.join("-");
  if (prefix === "login" && LOGIN_TOKEN.test(value)) return { kind: "login", token: value };
  if (prefix === "plan" && PLAN_ID.test(value)) return { kind: "plan", planId: value };
  if (prefix === "order" && CHECKOUT_ID.test(value)) return { kind: "order", checkoutId: value.toLowerCase() };
  return { kind: "menu" };
}

/** The payload text for a deep link, checked against Telegram's limits. */
export function buildPayload(kind: "login" | "plan" | "order", value: string): string {
  const payload = `${kind}-${value}`;
  if (payload.length > MAX_PAYLOAD_LENGTH || !SAFE.test(payload)) throw new Error(`start payload not allowed: ${kind}`);
  return payload;
}
