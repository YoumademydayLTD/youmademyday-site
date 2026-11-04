// Inline keyboards shared by several screens. Callback data is "<screen>[:<action>[:<value>]]", under Telegram's 64 bytes.
import type { Lang } from "../config/langs.ts";
import { t } from "../i18n/index.ts";
import type { InlineButton, InlineKeyboard } from "../telegram/types.ts";

export const button = (text: string, data: string): InlineButton => ({ text, callback_data: data });
export const link = (text: string, url: string): InlineButton => ({ text, url });

/** The main menu, as on the site: library, memberships (the bot's plans screen: the user's memberships with a
 * cancel button, and the link to the site's #plans), reminders, support, settings. */
export function mainMenu(lang: Lang): InlineKeyboard {
  return {
    inline_keyboard: [
      [button(t(lang, "menuLibrary"), "library"), button(t(lang, "menuPlans"), "plans")],
      [button(t(lang, "menuReminders"), "reminders"), button(t(lang, "menuSupport"), "support")],
      [button(t(lang, "menuSettings"), "settings")],
    ],
  };
}

export const backRow = (lang: Lang, to = "menu"): InlineButton[] => [button(t(lang, "back"), to)];
