// Bindings, variables and secrets the worker runs with (see wrangler.jsonc and README.md).
export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  BOT: Fetcher;
  BOT_URL: string;
  SITE_URL: string;
  GO_BASE_URL: string; // where GET /go/:id is served (the worker's own host until the domain's DNS moves)
  EXTRA_ORIGINS: string;
  POLAR_API: string;
  LIVE_KINDS: string;
  CRX_STATUS_CALLBACK_URL: string; // optional: where CRX link status changes are pushed ("" = off)
  POLAR_ACCESS_TOKEN: string;
  POLAR_WEBHOOK_SECRET: string;
  YMD_LINKS_SECRET: string;
  FILES_SIGNING_SECRET: string;
  YMD_INTERNAL_SECRET: string;
}
