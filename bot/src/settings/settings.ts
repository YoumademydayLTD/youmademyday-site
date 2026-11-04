// ⚙️ Settings: language, news opt-in, terms, privacy and account deletion.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { updateUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { isLang, LANG_NAMES, LANGS, sitePage, type Lang } from "../config/langs.ts";
import { showScreen } from "../telegram/send.ts";
import { backRow, button, link } from "../menu/keyboards.ts";
import { setUserCommands } from "../telegram/profile.ts";

export async function showSettings(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const { lang } = user;
  const news = t(lang, user.newsOptIn ? "on" : "off");
  const keyboard = {
    inline_keyboard: [
      [button(t(lang, "btnLang"), "set:langs"), button(t(lang, "menuReminders"), "reminders")],
      [button(t(lang, "btnNews", { state: news }), "set:news")],
      [link(t(lang, "btnTerms"), sitePage(ctx.env.SITE_URL, lang, "terms")), link(t(lang, "btnPrivacy"), sitePage(ctx.env.SITE_URL, lang, "privacy"))],
      [button(t(lang, "btnDelete"), "del:ask")],
      backRow(lang),
    ],
  };
  await showScreen(ctx, user.telegramId, messageId, t(lang, "settingsText", { lang: LANG_NAMES[lang], news }), keyboard);
}

async function showLangs(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const rows = LANGS.map((l: Lang) => [button(`${l === user.lang ? "✓ " : ""}${LANG_NAMES[l]}`, `set:lang:${l}`)]);
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, "pickLang"), { inline_keyboard: [...rows, backRow(user.lang, "settings")] });
}

/** Callback data "set:<action>[:<value>]". */
export async function handleSettingsAction(ctx: AppContext, user: BotUser, data: string, messageId: number | null): Promise<string | undefined> {
  const [, action, value] = data.split(":");
  if (action === "langs") return void (await showLangs(ctx, user, messageId));
  if (action === "lang" && isLang(value)) {
    await updateUser(ctx.db, user.telegramId, { lang: value }, ctx.nowIso);
    await setUserCommands(ctx, user.telegramId, value);
    await showSettings(ctx, { ...user, lang: value }, messageId);
    return t(value, "saved");
  }
  if (action === "news") {
    await updateUser(ctx.db, user.telegramId, { newsOptIn: !user.newsOptIn }, ctx.nowIso);
    await showSettings(ctx, { ...user, newsOptIn: !user.newsOptIn }, messageId);
    return t(user.lang, "saved");
  }
  return undefined;
}
