// Worker entry: CORS, routing, error replies, the cron, and the live hub's Durable Object class.
import type { Env } from "./env.ts";
import { createContext } from "./app/context.ts";
import { matchRoute, runRoute } from "./app/router.ts";
import { runCron } from "./app/cron.ts";
import { HttpError } from "./http/errors.ts";
import { errorResponse, json } from "./http/response.ts";
import { allowedOrigins, corsHeaders } from "./http/cors.ts";

export { AdminHub } from "./live/hub.ts";

const NO_CONTENT = 204;

export default {
  async fetch(request: Request, env: Env, execution: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const cors = url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/admin/")
      ? corsHeaders(request.headers.get("Origin"), allowedOrigins({ siteUrl: env.SITE_URL, extraOrigins: env.EXTRA_ORIGINS }))
      : {};
    if (request.method === "OPTIONS") return new Response(null, { status: NO_CONTENT, headers: cors });
    const match = matchRoute(request.method, url.pathname);
    if (!match) return url.pathname.startsWith("/api/") || url.pathname.startsWith("/telegram/") ? errorResponse(new HttpError("not_found", "no such route"), cors) : env.ASSETS.fetch(request);
    const ctx = createContext(env, new Date(), (promise) => execution.waitUntil(promise));
    try {
      const result = await runRoute(request, ctx, match);
      if (result instanceof Response) {
        if (result.status === 101 || !Object.keys(cors).length) return result;
        const headers = new Headers(result.headers);
        for (const [k, v] of Object.entries(cors)) headers.set(k, v);
        return new Response(result.body, { status: result.status, headers });
      }
      return json(result, 200, cors);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(error, cors);
      console.error("unhandled", request.method, url.pathname, error instanceof Error ? error.stack ?? error.message : String(error));
      return errorResponse(new HttpError("internal", "something went wrong on our side"), cors);
    }
  },

  async scheduled(_controller: ScheduledController, env: Env, execution: ExecutionContext): Promise<void> {
    await runCron(createContext(env, new Date(), (promise) => execution.waitUntil(promise)));
  },
} satisfies ExportedHandler<Env>;
