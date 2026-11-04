// The bot side of sign-in: /login gives a 6-digit code; "/start login-<token>" asks to confirm with a button.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { sitePage } from "../config/langs.ts";
import { randomDigits } from "../http/crypto.ts";
import { sendText, showScreen } from "../telegram/send.ts";
import { button, link } from "../menu/keyboards.ts";
import { CODE_LENGTH, confirmLink, newCode } from "./lifecycle.ts";
import { findLogin, insertLogin, transitionLogin } from "./repo.ts";

// A fresh code collides with a live one about once in 10^6; a few tries are plenty.
const CODE_TRIES = 5;
const CONFIRM_PREFIX = "login:";
// The support center is the owner's only (Hebrew); the prompt names it so a forwarded link cannot fool him.
const ADMIN_LOGIN_ASK = "להיכנס למרכז התמיכה?\nאם לא אתה פתחת עכשיו את הכניסה, אל תלחץ.";

export async function sendLoginCode(ctx: AppContext, user: BotUser): Promise<void> {
  for (let i = 0; i < CODE_TRIES; i += 1) {
    const code = randomDigits(CODE_LENGTH);
    if (await insertLogin(ctx.db, newCode(code, user.telegramId, ctx.nowSeconds), ctx.nowIso)) {
      await sendText(ctx, user.telegramId, t(user.lang, "loginCode", { code }));
      return;
    }
  }
  throw new Error("login: no free code");
}

const siteButton = (ctx: AppContext, user: BotUser) => ({ inline_keyboard: [[link(t(user.lang, "toSite"), sitePage(ctx.env.SITE_URL, user.lang))]] });

export async function askLoginConfirm(ctx: AppContext, user: BotUser, token: string): Promise<void> {
  const record = await findLogin(ctx.db, token);
  if (!record || !confirmLink(record, user.telegramId, ctx.nowSeconds)) {
    await sendText(ctx, user.telegramId, t(user.lang, "loginExpired"), { keyboard: siteButton(ctx, user) });
    return;
  }
  const ask = record.scope === "admin" ? ADMIN_LOGIN_ASK : t(user.lang, "loginAsk");
  await sendText(ctx, user.telegramId, ask, { keyboard: { inline_keyboard: [[button(t(user.lang, "loginConfirm"), `${CONFIRM_PREFIX}${token}`)]] } });
}

/** Callback "login:<token>". */
export async function confirmLogin(ctx: AppContext, user: BotUser, data: string, messageId: number | null): Promise<void> {
  const token = data.slice(CONFIRM_PREFIX.length);
  const record = await findLogin(ctx.db, token);
  const isConfirmed = record !== null && confirmLink(record, user.telegramId, ctx.nowSeconds) !== null
    && (await transitionLogin(ctx.db, token, "pending", "confirmed", user.telegramId));
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, isConfirmed ? "loginDone" : "loginExpired"), siteButton(ctx, user));
}
