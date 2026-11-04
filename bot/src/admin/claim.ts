// "/admin <code>" in the bot: the owner becomes the support admin, once.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { sendText } from "../telegram/send.ts";
import { link } from "../menu/keyboards.ts";
import { evaluateClaim } from "./guard.ts";
import { claimAdmin, isClaimed } from "./repo.ts";

export async function handleAdminClaim(ctx: AppContext, user: BotUser, givenCode: string): Promise<void> {
  const result = evaluateClaim({ configuredCode: ctx.env.ADMIN_CLAIM_CODE ?? "", givenCode, isClaimed: await isClaimed(ctx.db) });
  if (result !== "claimed" || !(await claimAdmin(ctx.db, user.telegramId, ctx.nowIso))) {
    // Same answer for every failure, so the command reveals nothing to a stranger.
    console.warn("admin: claim refused", result, user.telegramId);
    await sendText(ctx, user.telegramId, "לא הכרתי את הפקודה הזו.");
    return;
  }
  await sendText(ctx, user.telegramId, "מעכשיו אתה מנהל התמיכה ✓\nכל הודעה של לקוח תגיע לכאן. כדי לענות, משיבים להודעה. מרכז התמיכה המלא באתר:", {
    keyboard: { inline_keyboard: [[link("מרכז התמיכה", `${ctx.env.PUBLIC_URL}/admin/`)]] },
  });
}
