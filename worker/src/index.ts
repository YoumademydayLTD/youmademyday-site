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

type Handler = (request: Request, env: Env, ctx: ExecutionContext) => Promise<unknown>;

const ROUTES: Record<string, Handler> = {
  "POST /api/checkout": (request, env) => handleCheckout(request, env, new Date()),
  "POST /api/links": (request, env) => handleLink(request, env, new Date()),
  "POST /api/polar/webhook": (request, env, ctx) => handleWebhook(request, env, ctx, new Date()),
  "GET /api/downloads": (request, env) => handleDownloads(request, env),
  "GET /api/file": (request, env) => handleFile(request, env, new Date()),
  "GET /api/health": (_request, env) => handleHealth(env),
};
// Only the site's own pages call this endpoint from a browser.
const BROWSER_ROUTES = new Set(["POST /api/checkout", "GET /api/downloads"]);
const NO_CONTENT = 204;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin");
    const allowed = allowedOrigins({ siteUrl: env.SITE_URL, extraOrigins: env.EXTRA_ORIGINS });
    const cors = corsHeaders(origin, allowed);
    if (request.method === "OPTIONS") return new Response(null, { status: NO_CONTENT, headers: cors });
    const key = `${request.method} ${new URL(request.url).pathname}`;
    const handler = ROUTES[key];
    try {
      if (!handler) throw new HttpError("not_found", `no route ${key}`);
      if (BROWSER_ROUTES.has(key) && !isOriginAllowed(origin, allowed)) throw new HttpError("origin_forbidden", "this origin may not open checkouts");
      const result = await handler(request, env, ctx);
      return result instanceof Response ? result : json(result, 200, cors);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error, cors);
      console.error("unhandled", key, error instanceof Error ? error.stack ?? error.message : String(error));
      return errorResponse(new HttpError("internal", "something went wrong on our side"), cors);
    }
  },
} satisfies ExportedHandler<Env>;
