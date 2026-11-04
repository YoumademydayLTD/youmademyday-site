// GET /api/health: is the worker up, can it reach its database, and which checkouts are open.
import type { Env } from "./env.ts";
import { liveKinds } from "./checkout/request.ts";
import { PRODUCT_MAP } from "./polar/mapping.ts";

export async function handleHealth(env: Env): Promise<Record<string, unknown>> {
  let database = "ok";
  try { await env.DB.prepare("SELECT 1").first(); } catch (error) { database = `error: ${error instanceof Error ? error.message : String(error)}`; }
  return {
    ok: database === "ok",
    database,
    liveKinds: [...liveKinds(env.LIVE_KINDS)],
    products: Object.keys(PRODUCT_MAP).length,
    secrets: { polar: Boolean(env.POLAR_ACCESS_TOKEN), webhook: Boolean(env.POLAR_WEBHOOK_SECRET), links: Boolean(env.YMD_LINKS_SECRET) },
  };
}
