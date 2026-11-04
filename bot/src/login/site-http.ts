// The site's account endpoints: who is signed in (GET /api/me) and sign-out. The session is a bearer token.
import type { AppContext } from "../app/context.ts";
import { HttpError } from "../http/errors.ts";
import { bearerToken, deleteSession, findSession } from "../sessions/repo.ts";
import { publicUser } from "./http.ts";

export async function getMe(request: Request, ctx: AppContext): Promise<unknown> {
  const session = await findSession(ctx.db, bearerToken(request), ctx.nowSeconds);
  if (!session || session.scope !== "site") throw new HttpError("unauthorized", "not signed in");
  return { user: await publicUser(ctx.db, session.telegramId) };
}

export async function postLogout(request: Request, ctx: AppContext): Promise<unknown> {
  const token = bearerToken(request);
  if (token) await deleteSession(ctx.db, token);
  return { ok: true };
}
