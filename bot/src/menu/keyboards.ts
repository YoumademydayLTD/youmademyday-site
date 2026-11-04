// Inline keyboards shared by several screens. Callback data is "<screen>[:<action>[:<value>]]", under Telegram's 64 bytes.
import type { Lang } from "../config/langs.ts";
import { sitePage } from "../config/langs.ts";
import { t } from "../i18n/index.ts";
import type { InlineButton, InlineKeyboard } from "../telegram/types.ts";

export const button = (text: string, data: string): InlineButton => ({ text, callback_data: data });
export const link = (text: string, url: string): InlineButton => ({ text, url });

/** The main menu, as on the site: library, memberships (site #plans), reminders, support, settings. */
export function mainMenu(lang: Lang, siteUrl: string): InlineKeyboard {
  return {
    inline_keyboard: [
      [button(t(lang, "menuLibrary"), "library"), link(t(lang, "menuPlans"), sitePage(siteUrl, lang, "plans"))],
      [button(t(lang, "menuReminders"), "reminders"), button(t(lang, "menuSupport"), "support")],
      [button(t(lang, "menuSettings"), "settings")],
    ],
  };
}

export const backRow = (lang: Lang, to = "menu"): InlineButton[] => [button(t(lang, "back"), to)];
