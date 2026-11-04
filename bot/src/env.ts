// Bindings, variables and secrets the bot worker runs with (see wrangler.jsonc and README.md).
export interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  STORE: Fetcher;
  HUB: DurableObjectNamespace;
  ASSETS: Fetcher;
  SITE_URL: string;
  STORE_URL: string;
  PUBLIC_URL: string;
  EXTRA_ORIGINS: string;
  BOT_USERNAME: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  ADMIN_CLAIM_CODE: string;
  YMD_INTERNAL_SECRET: string; // shared with the store worker for calls between the two
}
