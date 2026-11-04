// Routes: "METHOD /path" with :id parts. Site routes get CORS; admin routes need the admin cookie.
import type { AppContext } from "./context.ts";
import { HttpError } from "../http/errors.ts";
import { startLogin, verifyCode, waitLogin } from "../login/http.ts";
import { getMe, postLogout } from "../login/site-http.ts";
import { handleWebhook } from "../webhook/handler.ts";
import { adminLogout, adminMe, adminVerify, adminWait, requireAdmin } from "../admin/auth.ts";
import { getMedia, getThread, getThreads, getUserCard, postRead, postReply, postStatus } from "../admin/threads-http.ts";
import { getContent, getQuickReplies, postContent, postContentDelete, postQuickReply, postQuickReplyDelete } from "../admin/content-http.ts";
import { connect } from "../live/hub.ts";
import { searchCustomers } from "../admin/customers.ts";
import { postOrderPaid } from "../internal/orders-http.ts";

type Params = Record<string, string>;
type Handler = (request: Request, ctx: AppContext, params: Params) => Promise<unknown>;
interface Route { method: string; pattern: string; access: "public" | "site" | "admin"; handler: Handler }

const id = (params: Params, name = "id"): number => {
  const n = Number(params[name]);
  if (!Number.isSafeInteger(n) || n <= 0) throw new HttpError("bad_request", `${name} must be a positive number`);
  return n;
};

export const ROUTES: readonly Route[] = [
  { method: "POST", pattern: "/telegram/webhook", access: "public", handler: (r, c) => handleWebhook(r, c) },
  { method: "POST", pattern: "/api/login/start", access: "site", handler: (_r, c) => startLogin(c, "site") },
  { method: "POST", pattern: "/api/login/wait", access: "site", handler: (r, c) => waitLogin(r, c, "site") },
  { method: "POST", pattern: "/api/login/verify", access: "site", handler: (r, c) => verifyCode(r, c, "site") },
  { method: "GET", pattern: "/api/me", access: "site", handler: (r, c) => getMe(r, c) },
  { method: "POST", pattern: "/api/logout", access: "site", handler: (r, c) => postLogout(r, c) },
  { method: "POST", pattern: "/api/admin/login/start", access: "public", handler: (_r, c) => startLogin(c, "admin") },
  { method: "POST", pattern: "/api/admin/login/wait", access: "public", handler: (r, c) => adminWait(r, c) },
  { method: "POST", pattern: "/api/admin/login/verify", access: "public", handler: (r, c) => adminVerify(r, c) },
  { method: "POST", pattern: "/api/admin/logout", access: "public", handler: (r, c) => adminLogout(r, c) },
  { method: "GET", pattern: "/api/admin/me", access: "public", handler: (r, c) => adminMe(r, c) },
  { method: "GET", pattern: "/api/admin/live", access: "admin", handler: (r, c) => connect(c.env, r) },
  { method: "GET", pattern: "/api/admin/threads", access: "admin", handler: (r, c) => getThreads(r, c) },
  { method: "GET", pattern: "/api/admin/threads/:id", access: "admin", handler: (_r, c, p) => getThread(c, id(p)) },
  { method: "POST", pattern: "/api/admin/threads/:id/reply", access: "admin", handler: (r, c, p) => postReply(r, c, id(p)) },
  { method: "POST", pattern: "/api/admin/threads/:id/read", access: "admin", handler: (_r, c, p) => postRead(c, id(p)) },
  { method: "POST", pattern: "/api/admin/threads/:id/status", access: "admin", handler: (r, c, p) => postStatus(r, c, id(p)) },
  { method: "GET", pattern: "/api/admin/users/:id", access: "admin", handler: (_r, c, p) => getUserCard(c, id(p)) },
  { method: "GET", pattern: "/api/admin/customers", access: "admin", handler: (r, c) => searchCustomers(r, c) },
  // From the store worker over its service binding; checked with the shared internal secret.
  { method: "POST", pattern: "/api/internal/orders/paid", access: "public", handler: (r, c) => postOrderPaid(r, c) },
  { method: "GET", pattern: "/api/admin/quick-replies", access: "admin", handler: (_r, c) => getQuickReplies(c) },
  { method: "POST", pattern: "/api/admin/quick-replies", access: "admin", handler: (r, c) => postQuickReply(r, c) },
  { method: "POST", pattern: "/api/admin/quick-replies/:id/delete", access: "admin", handler: (_r, c, p) => postQuickReplyDelete(c, id(p)) },
  { method: "GET", pattern: "/api/admin/content", access: "admin", handler: (r, c) => getContent(r, c) },
  { method: "POST", pattern: "/api/admin/content", access: "admin", handler: (r, c) => postContent(r, c) },
  { method: "POST", pattern: "/api/admin/content/:id/delete", access: "admin", handler: (_r, c, p) => postContentDelete(c, id(p)) },
  { method: "GET", pattern: "/admin/file/:fileId", access: "admin", handler: (_r, c, p) => getMedia(c, p.fileId ?? "") },
];

/** The route and its path parameters for a request (pure). */
export function matchRoute(method: string, path: string, routes: readonly Route[] = ROUTES): { route: Route; params: Params } | null {
  const parts = path.split("/").filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const pattern = route.pattern.split("/").filter(Boolean);
    if (pattern.length !== parts.length) continue;
    const params: Params = {};
    const isMatch = pattern.every((seg, i) => {
      const part = parts[i] ?? "";
      if (seg.startsWith(":")) { params[seg.slice(1)] = decodeURIComponent(part); return part.length > 0; }
      return seg === part;
    });
    if (isMatch) return { route, params };
  }
  return null;
}

/** Runs a matched route, checking the admin cookie first for admin routes. */
export async function runRoute(request: Request, ctx: AppContext, match: { route: Route; params: Params }): Promise<unknown> {
  if (match.route.access === "admin") await requireAdmin(request, ctx);
  return match.route.handler(request, ctx, match.params);
}
