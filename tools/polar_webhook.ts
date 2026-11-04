// Create the Polar webhook endpoint that points at the payment worker, once, and keep its signing secret
// in Site/.env as POLAR_WEBHOOK_SECRET (never printed). Then: wrangler secret put POLAR_WEBHOOK_SECRET (see worker/README.md).
// Run: node tools/polar_webhook.ts https://<worker>/api/polar/webhook
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listAll, polar, ROOT } from "./polar/api.ts";

const ENV_FILE = join(ROOT, ".env");
const SECRET_NAME = "POLAR_WEBHOOK_SECRET";
export const WEBHOOK_EVENTS = [
  "checkout.created", "checkout.updated", "checkout.expired",
  "order.created", "order.paid", "order.updated", "order.refunded",
  "subscription.created", "subscription.active", "subscription.updated", "subscription.canceled",
  "subscription.uncanceled", "subscription.revoked", "subscription.past_due",
];

interface Endpoint { id: string; url: string; secret: string; events: string[] }

const hasSecret = (): boolean => existsSync(ENV_FILE) && readFileSync(ENV_FILE, "utf8").split("\n").some((l) => l.startsWith(`${SECRET_NAME}=`));

async function main(url: string): Promise<void> {
  const found = (await listAll<Endpoint>("/webhooks/endpoints")).find((e) => e.url === url);
  if (found) {
    await polar("PATCH", `/webhooks/endpoints/${found.id}`, { events: WEBHOOK_EVENTS });
    console.log(`webhook endpoint ${found.id} already exists; events updated${hasSecret() ? "" : `; ${SECRET_NAME} is NOT in .env — reset the secret in Polar`}`);
    return;
  }
  const created = await polar<Endpoint>("POST", "/webhooks/endpoints", { url, format: "raw", events: WEBHOOK_EVENTS, name: "ymd-store worker" });
  if (hasSecret()) throw new Error(`${SECRET_NAME} already in .env; remove the old line first (endpoint ${created.id} was created)`);
  appendFileSync(ENV_FILE, `${SECRET_NAME}=${created.secret}\n`);
  console.log(`webhook endpoint ${created.id} created for ${url}; secret saved to .env as ${SECRET_NAME}`);
}

const url = process.argv[2];
if (!url?.startsWith("https://")) {
  console.error("usage: node tools/polar_webhook.ts https://<worker>/api/polar/webhook");
  process.exitCode = 1;
} else {
  try { await main(url); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
