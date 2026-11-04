// Who is signed in: the bot worker owns the Telegram sign-in, so the site's bearer session is checked there
// (GET /api/me over the service binding). The store never stores or reads session tokens itself.
import type { Env } from "../env.ts";
import { HttpError } from "../http/errors.ts";

export interface SiteUser { telegramId: number; name: string; lang: string }

const BEARER = "Bearer ";
const HTTP_UNAUTHORIZED = 401;

export function parseUser(data: unknown): SiteUser | null {
  if (typeof data !== "object" || data === null) return null;
  const user = (data as { user?: unknown }).user;
  if (typeof user !== "object" || user === null) return null;
  const { id, name, lang } = user as Record<string, unknown>;
  return typeof id === "number" && typeof lang === "string" ? { telegramId: id, name: typeof name === "string" ? name : "", lang } : null;
}

/** The signed-in user of a request, or a login_required error. */
export async function requireUser(request: Request, env: Env): Promise<SiteUser> {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith(BEARER) || header.length === BEARER.length) throw new HttpError("login_required", "sign in with Telegram first");
  const response = await env.BOT.fetch(`${env.BOT_URL}/api/me`, { headers: { Authorization: header } });
  if (response.status === HTTP_UNAUTHORIZED) throw new HttpError("login_required", "the sign-in has expired; sign in again");
  if (!response.ok) {
    console.error("session: bot /api/me answered", response.status);
    throw new HttpError("internal", "could not check the sign-in");
  }
  const user = parseUser(await response.json());
  if (!user) throw new HttpError("internal", "unexpected sign-in reply");
  return user;
}
