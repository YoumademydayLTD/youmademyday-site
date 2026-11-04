// Sign-in endpoints shared by the site (scope "site", bearer session) and the support center (scope "admin", cookie).
import type { AppContext } from "../app/context.ts";
import { tick } from "../app/context.ts";
import { HttpError } from "../http/errors.ts";
import { readJsonObject, requireString } from "../http/response.ts";
import { randomToken } from "../http/crypto.ts";
import { buildPayload } from "../start/payload.ts";
import { codeId, isThrottled, isValidCode, linkState, newLink, redeemCode } from "./lifecycle.ts";
import { countFailedCodes, findLogin, insertLogin, recordFailedCode, transitionLogin } from "./repo.ts";
import { createSession, type Scope } from "../sessions/repo.ts";
import { displayName, findUser } from "../users/repo.ts";
import { isAdmin } from "../admin/repo.ts";

// Long-poll: the site waits up to 20 s per request while the user confirms in Telegram.
const LONG_POLL_MS = 20_000;
const POLL_INTERVAL_MS = 1_500;
const MAX_TOKEN_LENGTH = 64;

export interface PublicUser { id: number; name: string; username: string | null; lang: string }
export interface SignedIn { status: "ok"; session: string; expiresAt: number; user: PublicUser }

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function publicUser(db: D1Database, telegramId: number): Promise<PublicUser> {
  const user = await findUser(db, telegramId);
  if (!user) throw new HttpError("unauthorized", "this Telegram account is not known to the bot");
  return { id: user.telegramId, name: displayName(user), username: user.username, lang: user.lang };
}

export async function startLogin(ctx: AppContext): Promise<{ token: string; deepLink: string; expiresAt: number }> {
  const record = newLink(randomToken(), ctx.nowSeconds);
  if (!(await insertLogin(ctx.db, record, ctx.nowIso))) throw new HttpError("internal", "could not start the sign-in, please try again");
  const deepLink = `https://t.me/${ctx.env.BOT_USERNAME}?start=${buildPayload("login", record.id)}`;
  return { token: record.id, deepLink, expiresAt: record.expiresAt };
}

async function signIn(ctx: AppContext, telegramId: number, scope: Scope): Promise<SignedIn> {
  if (scope === "admin" && !(await isAdmin(ctx.db, telegramId))) throw new HttpError("forbidden", "this Telegram account is not the support admin");
  const user = await publicUser(ctx.db, telegramId);
  const { token, expiresAt } = await createSession(ctx.db, telegramId, scope, ctx.nowSeconds, ctx.nowIso);
  return { status: "ok", session: token, expiresAt, user };
}

export async function waitLogin(request: Request, ctx: AppContext, scope: Scope): Promise<SignedIn | { status: "pending" | "expired" }> {
  const token = requireString(await readJsonObject(request), "token", MAX_TOKEN_LENGTH);
  const started = Date.now();
  for (let now = ctx; ; now = tick(ctx)) {
    const state = linkState(await findLogin(now.db, token), now.nowSeconds);
    if (state.status === "ready") {
      // Only one waiter turns a confirmed link into a session.
      if (!(await transitionLogin(now.db, token, "confirmed", "used", null))) return { status: "expired" };
      return signIn(now, state.telegramId, scope);
    }
    if (state.status === "expired" || Date.now() - started + POLL_INTERVAL_MS > LONG_POLL_MS) return state;
    await sleep(POLL_INTERVAL_MS);
  }
}

export async function verifyCode(request: Request, ctx: AppContext, scope: Scope): Promise<SignedIn> {
  const code = requireString(await readJsonObject(request), "code", MAX_TOKEN_LENGTH).replace(/\s+/g, "");
  const client = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (isThrottled(await countFailedCodes(ctx.db, client, ctx.nowSeconds))) throw new HttpError("too_many_requests", "too many wrong codes; wait a few minutes and ask the bot for a new one");
  const telegramId = isValidCode(code) ? redeemCode(await findLogin(ctx.db, codeId(code)), ctx.nowSeconds) : null;
  if (telegramId === null || !(await transitionLogin(ctx.db, codeId(code), "confirmed", "used", null))) {
    await recordFailedCode(ctx.db, client, ctx.nowSeconds);
    throw new HttpError("unauthorized", "this code is wrong or has expired; send /login to the bot for a new one");
  }
  return signIn(ctx, telegramId, scope);
}

