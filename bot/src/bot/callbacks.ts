// Inline-button presses. Every press is answered (Telegram shows a spinner until then), with a short toast when useful.
import type { AppContext } from "../app/context.ts";
import type { TgCallbackQuery } from "../telegram/types.ts";
import type { BotUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { answerCallback, showScreen } from "../telegram/send.ts";
import { showMenu, showPlans, showSupport } from "../menu/screens.ts";
import { handleMembershipAction } from "../billing/screen.ts";
import { resendItem, showLibrary } from "../library/screen.ts";
import { handleReminderAction, joinSpark, showReminders } from "../settings/reminders.ts";
import { handleSettingsAction, showSettings } from "../settings/settings.ts";
import { askDelete, confirmDelete } from "../privacy/delete.ts";
import { confirmLogin } from "../login/bot.ts";
import { handleDone, handleLater } from "../daily/callbacks.ts";

type Action = (ctx: AppContext, user: BotUser, data: string, messageId: number | null) => Promise<string | undefined | void>;

const ACTIONS: Record<string, Action> = {
  menu: (ctx, user, _d, id) => showMenu(ctx, user, id),
  library: (ctx, user, _d, id) => showLibrary(ctx, user, id),
  lib: (ctx, user, data) => resendItem(ctx, user, data),
  reminders: (ctx, user, _d, id) => showReminders(ctx, user, id),
  rem: handleReminderAction,
  join: (ctx, user) => joinSpark(ctx, user),
  support: (ctx, user, _d, id) => showSupport(ctx, user, id),
  plans: (ctx, user, _d, id) => showPlans(ctx, user, id),
  sub: (ctx, user, data, id) => handleMembershipAction(ctx, user, data, id, () => showPlans(ctx, user, id)),
  settings: (ctx, user, _d, id) => showSettings(ctx, user, id),
  set: handleSettingsAction,
  login: confirmLogin,
  done: (ctx, user) => handleDone(ctx, user),
  later: (ctx, user, data) => handleLater(ctx, user, data),
  del: async (ctx, user, data, id) => {
    if (data === "del:yes") return confirmDelete(ctx, user, id);
    if (data === "del:no") return showScreen(ctx, user.telegramId, id, t(user.lang, "deleteKept"), { inline_keyboard: [] });
    return askDelete(ctx, user, id);
  },
};

export async function handleCallback(ctx: AppContext, user: BotUser, query: TgCallbackQuery): Promise<void> {
  const data = query.data ?? "";
  const action = ACTIONS[data.split(":")[0] ?? ""];
  let toast: string | undefined;
  try {
    toast = action ? (await action(ctx, user, data, query.message?.message_id ?? null)) ?? undefined : undefined;
  } finally {
    await answerCallback(ctx, query.id, toast).catch(() => undefined);
  }
}
