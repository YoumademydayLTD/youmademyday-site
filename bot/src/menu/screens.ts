// The welcome screen with the main menu, and the plans and support entry screens.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { escapeHtml, t } from "../i18n/index.ts";
import { sitePage } from "../config/langs.ts";
import { showScreen } from "../telegram/send.ts";
import { backRow, link, mainMenu } from "./keyboards.ts";

export async function showMenu(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const text = `${t(user.lang, "welcome", { name: escapeHtml(user.firstName) })}\n\n${t(user.lang, "menuPrompt")}`;
  await showScreen(ctx, user.telegramId, messageId, text, mainMenu(user.lang, ctx.env.SITE_URL));
}

export async function showPlans(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const keyboard = { inline_keyboard: [[link(t(user.lang, "plansButton"), sitePage(ctx.env.SITE_URL, user.lang, "plans"))], backRow(user.lang)] };
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, "plansText"), keyboard);
}

export async function showSupport(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, "supportOpen"), { inline_keyboard: [backRow(user.lang)] });
}
