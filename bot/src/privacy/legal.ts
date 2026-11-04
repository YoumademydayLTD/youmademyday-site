// /terms and /privacy: the site's pages in the user's language.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { sitePage } from "../config/langs.ts";
import { sendText } from "../telegram/send.ts";
import { link } from "../menu/keyboards.ts";

export async function sendLegal(ctx: AppContext, user: BotUser, page: "terms" | "privacy"): Promise<void> {
  const [textKey, buttonKey] = page === "terms" ? (["termsText", "btnTerms"] as const) : (["privacyText", "btnPrivacy"] as const);
  await sendText(ctx, user.telegramId, t(user.lang, textKey), { keyboard: { inline_keyboard: [[link(t(user.lang, buttonKey), sitePage(ctx.env.SITE_URL, user.lang, page))]] } });
}
