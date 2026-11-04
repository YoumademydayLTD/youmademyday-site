// Support-center sessions: an HttpOnly cookie (same origin as /admin), checked on every admin request.
import type { AppContext } from "../app/context.ts";
import { HttpError } from "../http/errors.ts";
import { json } from "../http/response.ts";
import { deleteSession, findSession, SESSION_TTL_SECONDS } from "../sessions/repo.ts";
import { verifyCode, waitLogin, type SignedIn } from "../login/http.ts";
import { adminFrom } from "./guard.ts";
import { listAdminIds } from "./repo.ts";
import { displayName, findUser } from "../users/repo.ts";

export const COOKIE = "ymd_admin";

export function readCookie(request: Request, name: string): string {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return "";
}

const cookieHeader = (value: string, maxAge: number): string => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

/** The admin's Telegram id, or 401. */
export async function requireAdmin(request: Request, ctx: AppContext): Promise<number> {
  const session = await findSession(ctx.db, readCookie(request, COOKIE), ctx.nowSeconds);
  const adminId = adminFrom(session, await listAdminIds(ctx.db));
  if (adminId === null) throw new HttpError("unauthorized", "sign in to the support center");
  return adminId;
}

function withCookie(result: SignedIn): Response {
  return json({ status: "ok", user: result.user }, 200, { "Set-Cookie": cookieHeader(result.session, SESSION_TTL_SECONDS.admin) });
}

export async function adminWait(request: Request, ctx: AppContext): Promise<Response> {
  const result = await waitLogin(request, ctx, "admin");
  return result.status === "ok" ? withCookie(result) : json(result);
}

export async function adminVerify(request: Request, ctx: AppContext): Promise<Response> {
  return withCookie(await verifyCode(request, ctx, "admin"));
}

export async function adminMe(request: Request, ctx: AppContext): Promise<unknown> {
  const id = await requireAdmin(request, ctx);
  const user = await findUser(ctx.db, id);
  return { admin: { id, name: user ? displayName(user) : String(id) } };
}

export async function adminLogout(request: Request, ctx: AppContext): Promise<Response> {
  const token = readCookie(request, COOKIE);
  if (token) await deleteSession(ctx.db, token);
  return json({ ok: true }, 200, { "Set-Cookie": cookieHeader("", 0) });
}
