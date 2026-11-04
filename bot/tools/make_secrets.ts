// Creates the bot's own secrets in Site/.env.bot once (the webhook secret and the one-time admin claim code).
// Then put them with: grep '^NAME=' ../.env.bot | cut -d= -f2- | tr -d '\n' | npx wrangler secret put NAME
import { ensureSecret } from "./env-file.ts";

const SECRET_BYTES = 32;
for (const name of ["TELEGRAM_WEBHOOK_SECRET", "ADMIN_CLAIM_CODE"]) {
  console.log(`${name}: ${ensureSecret(name, SECRET_BYTES) ? "created" : "already there"}`);
}
