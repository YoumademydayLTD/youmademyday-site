// Slash commands and /start payloads.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { sendText } from "../telegram/send.ts";
import { link, mainMenu } from "../menu/keyboards.ts";
import { sitePage } from "../config/langs.ts";
import { FREE_TRACK } from "../config/tracks.ts";
import { parseStartText, type StartPayload } from "../start/payload.ts";
import { showMenu, showPlans, showSupport } from "../menu/screens.ts";
import { showLibrary } from "../library/screen.ts";
import { handleOrderStart } from "../library/order.ts";
import { showReminders, joinSpark } from "../settings/reminders.ts";
import { showSettings } from "../settings/settings.ts";
import { askDelete } from "../privacy/delete.ts";
import { sendLegal } from "../privacy/legal.ts";
import { askLoginConfirm, sendLoginCode } from "../login/bot.ts";
import { handleAdminClaim } from "../admin/claim.ts";

/** "/start@youmademydaystore_bot payload" → { name: "start", args: "payload" }. */
export function parseCommand(text: string): { name: string; args: string } | null {
  const match = /^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i.exec(text.trim());
  return match ? { name: (match[1] ?? "").toLowerCase(), args: (match[2] ?? "").trim() } : null;
}

async function handlePlan(ctx: AppContext, user: BotUser, planId: string): Promise<void> {
  if (planId === FREE_TRACK) return joinSpark(ctx, user);
  // Paid plans are bought on the site (the site's plan buttons go there; this covers an old or shared link).
  await sendText(ctx, user.telegramId, t(user.lang, "planOnSite"), { keyboard: { inline_keyboard: [[link(t(user.lang, "planButton"), sitePage(ctx.env.SITE_URL, user.lang, `buy-plan-${planId}`))]] } });
}

async function handleStart(ctx: AppContext, user: BotUser, payload: StartPayload): Promise<void> {
  switch (payload.kind) {
    case "login": return askLoginConfirm(ctx, user, payload.token);
    case "order": return handleOrderStart(ctx, user, payload.checkoutId);
    case "plan": return handlePlan(ctx, user, payload.planId);
    case "support": return showSupport(ctx, user, null);
    case "home": case "menu": return showMenu(ctx, user, null);
  }
}

const SIMPLE: Record<string, (ctx: AppContext, user: BotUser) => Promise<void>> = {
  library: (ctx, user) => showLibrary(ctx, user, null),
  plans: (ctx, user) => showPlans(ctx, user, null),
  reminders: (ctx, user) => showReminders(ctx, user, null),
  support: (ctx, user) => showSupport(ctx, user, null),
  login: sendLoginCode,
  settings: (ctx, user) => showSettings(ctx, user, null),
  terms: (ctx, user) => sendLegal(ctx, user, "terms"),
  privacy: (ctx, user) => sendLegal(ctx, user, "privacy"),
  delete: (ctx, user) => askDelete(ctx, user, null),
};

export async function handleCommand(ctx: AppContext, user: BotUser, text: string): Promise<void> {
  const command = parseCommand(text);
  if (command?.name === "start") return handleStart(ctx, user, parseStartText(text));
  if (command?.name === "admin") return handleAdminClaim(ctx, user, command.args);
  const handler = command ? SIMPLE[command.name] : undefined;
  if (handler) return handler(ctx, user);
  await sendText(ctx, user.telegramId, t(user.lang, "unknown"), { keyboard: mainMenu(user.lang) });
}
