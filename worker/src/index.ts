// Worker entry: CORS, routing and error replies. Each endpoint's logic lives in its own folder.
import type { Env } from "./env.ts";
import { HttpError } from "./http/errors.ts";
import { errorResponse, json } from "./http/response.ts";
import { allowedOrigins, corsHeaders, isOriginAllowed } from "./http/cors.ts";
import { handleCheckout } from "./checkout/handler.ts";
import { handleLink } from "./links/handler.ts";
import { handleWebhook } from "./webhook/handler.ts";
import { handleHealth } from "./health.ts";
import { handleDownloads, handleFile } from "./delivery/handler.ts";
import { handleAccount, handleAccountCancel } from "./account/handler.ts";
import { handleInvoice } from "./account/invoice.ts";
import { handleOrderDoc } from "./orderdoc/handler.ts";
import { handleInternalCancel } from "./internal/handler.ts";
import { matchRoute, type Route } from "./http/router.ts";

type Handler = (request: Request, env: Env, ctx: ExecutionContext, params: Record<string, string>) => Promise<unknown>;

const route = (method: string, pattern: string, handler: Handler): Route<Handler> => ({ method, pattern, handler });
const ROUTES: Route<Handler>[] = [
  route("POST", "/api/checkout", (request, env) => handleCheckout(request, env, new Date())),
  route("POST", "/api/links", (request, env) => handleLink(request, env, new Date())),
  route("POST", "/api/polar/webhook", (request, env, ctx) => handleWebhook(request, env, ctx, new Date())),
  route("GET", "/api/downloads", (request, env) => handleDownloads(request, env)),
  route("GET", "/api/file", (request, env) => handleFile(request, env, new Date())),
  route("GET", "/api/account", (request, env) => handleAccount(request, env, new Date())),
  route("POST", "/api/account/subscriptions/:id/cancel", (request, env, _ctx, p) => handleAccountCancel(request, env, p.id ?? "", new Date())),
  route("GET", "/api/invoice", (request, env) => handleInvoice(request, env, new Date())),
  route("GET", "/api/order-doc", (request, env) => handleOrderDoc(request, env, new Date())),
  route("POST", "/api/internal/subscriptions/cancel", (request, env) => handleInternalCancel(request, env, new Date())),
  route("GET", "/api/health", (_request, env) => handleHealth(env)),
];
// Endpoints the site's own pages call from a browser: other origins are refused.
const BROWSER_ROUTES = new Set(["POST /api/checkout", "GET /api/downloads", "GET /api/account", "POST /api/account/subscriptions/:id/cancel"]);
const NO_CONTENT = 204;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigins({ siteUrl: env.SITE_URL, extraOrigins: env.EXTRA_ORIGINS });
    const cors = corsHeaders(origin, allowed);
    if (request.method === "OPTIONS") return new Response(null, { status: NO_CONTENT, headers: cors });
    const path = new URL(request.url).pathname;
    const match = matchRoute(ROUTES, request.method, path);
    const key = match?.key ?? `${request.method} ${path}`;
    try {
      if (!match) throw new HttpError("not_found", `no route ${key}`);
      if (BROWSER_ROUTES.has(match.key) && !isOriginAllowed(origin, allowed)) throw new HttpError("origin_forbidden", "this origin may not call this endpoint");
      const result = await match.handler(request, env, ctx, match.params);
      return result instanceof Response ? result : json(result, 200, cors);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error, cors);
      console.error("unhandled", key, error instanceof Error ? error.stack ?? error.message : String(error));
      return errorResponse(new HttpError("internal", "something went wrong on our side"), cors);
    }
  },
} satisfies ExportedHandler<Env>;
