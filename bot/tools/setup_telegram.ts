// Sets the bot's public face and its webhook through the Bot API: name, descriptions and commands in each
// language (English also as the default), the menu button, the profile photo and the webhook. Safe to re-run.
// Usage: node tools/setup_telegram.ts [--photo]   (the photo is re-uploaded only with --photo)
import { readFileSync } from "node:fs";
import { readEnv } from "./env-file.ts";
import { DEFAULT_LANG, LANGS } from "../src/config/langs.ts";
import { PROFILES } from "../src/i18n/index.ts";
import { commandsFor } from "../src/telegram/commands.ts";

const WORKER_URL = "https://ymd-bot.crx-platform-website.workers.dev";
const AVATAR = new URL("../../brand/bot-avatar.jpg", import.meta.url);
const ALLOWED_UPDATES = ["message", "callback_query", "my_chat_member"];

const env = readEnv();
const token = env.TELEGRAM_BOT_TOKEN ?? "";
const webhookSecret = env.TELEGRAM_WEBHOOK_SECRET ?? "";
if (!token || !webhookSecret) throw new Error("Site/.env.bot needs TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET (run tools/make_secrets.ts)");

async function call(method: string, body: Record<string, unknown> | FormData): Promise<unknown> {
  const isForm = body instanceof FormData;
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", ...(isForm ? { body } : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  const reply = (await response.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!reply.ok) throw new Error(`${method}: ${reply.description ?? response.status}`);
  return reply.result;
}

for (const lang of LANGS) {
  const profile = PROFILES[lang];
  // An empty language_code is the default for every language the bot has no text for: English.
  for (const code of lang === DEFAULT_LANG ? [lang, ""] : [lang]) {
    await call("setMyName", { name: profile.name, language_code: code });
    await call("setMyDescription", { description: profile.description, language_code: code });
    await call("setMyShortDescription", { short_description: profile.shortDescription, language_code: code });
    await call("setMyCommands", { commands: commandsFor(lang), ...(code ? { language_code: code } : {}) });
  }
  console.log(`profile ${lang}: ok`);
}
await call("setChatMenuButton", { menu_button: { type: "commands" } });
console.log("menu button: commands");

if (process.argv.includes("--photo")) {
  const form = new FormData();
  form.set("photo", JSON.stringify({ type: "static", photo: "attach://avatar" }));
  form.set("avatar", new Blob([readFileSync(AVATAR)], { type: "image/jpeg" }), "bot-avatar.jpg");
  await call("setMyProfilePhoto", form);
  console.log("profile photo: set");
}

await call("setWebhook", { url: `${WORKER_URL}/telegram/webhook`, secret_token: webhookSecret, allowed_updates: ALLOWED_UPDATES, max_connections: 40 });
const info = (await call("getWebhookInfo", {})) as { url: string; pending_update_count: number; last_error_message?: string };
console.log(`webhook: ${info.url} · pending ${info.pending_update_count}${info.last_error_message ? ` · last error: ${info.last_error_message}` : ""}`);
