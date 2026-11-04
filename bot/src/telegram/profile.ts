// Sets a user's command list in their chosen language (after a language switch in settings).
import type { AppContext } from "../app/context.ts";
import type { Lang } from "../config/langs.ts";
import { commandsFor } from "./commands.ts";

export async function setUserCommands(ctx: AppContext, chatId: number, lang: Lang): Promise<void> {
  await ctx.tg.call("setMyCommands", { commands: commandsFor(lang), scope: { type: "chat", chat_id: chatId } });
}
