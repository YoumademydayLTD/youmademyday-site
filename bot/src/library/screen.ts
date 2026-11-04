// 📚 My library: the products of every order linked to this user, each a button that sends the file again.
import type { AppContext } from "../app/context.ts";
import type { BotUser } from "../users/repo.ts";
import { t } from "../i18n/index.ts";
import { sitePage } from "../config/langs.ts";
import { showScreen } from "../telegram/send.ts";
import { backRow, button, link } from "../menu/keyboards.ts";
import { listUserLinks } from "./links.ts";
import { fetchDownloads, type DownloadItem } from "./store.ts";
import { sendFiles } from "./send-files.ts";

async function ownedItems(ctx: AppContext, telegramId: number): Promise<{ checkoutId: string; item: DownloadItem }[]> {
  const owned: { checkoutId: string; item: DownloadItem }[] = [];
  for (const { checkoutId } of await listUserLinks(ctx.db, telegramId)) {
    const downloads = await fetchDownloads(ctx, checkoutId);
    if (downloads.status === "ready") owned.push(...downloads.items.map((item) => ({ checkoutId, item })));
  }
  return owned;
}

export async function showLibrary(ctx: AppContext, user: BotUser, messageId: number | null): Promise<void> {
  const owned = await ownedItems(ctx, user.telegramId);
  if (!owned.length) {
    await showScreen(ctx, user.telegramId, messageId, t(user.lang, "libraryEmpty"), { inline_keyboard: [[link(t(user.lang, "toShop"), sitePage(ctx.env.SITE_URL, user.lang))], backRow(user.lang)] });
    return;
  }
  const rows = owned.map(({ checkoutId, item }) => [button(`📘 ${item.title}`, `lib:${checkoutId}:${item.id}`)]);
  await showScreen(ctx, user.telegramId, messageId, t(user.lang, "libraryHead"), { inline_keyboard: [...rows, backRow(user.lang)] });
}

/** Callback "lib:<checkout id>:<product id>": sends that file again, only from an order of this user. */
export async function resendItem(ctx: AppContext, user: BotUser, data: string): Promise<void> {
  const [, checkoutId, productId] = data.split(":");
  const isOwn = (await listUserLinks(ctx.db, user.telegramId)).some((l) => l.checkoutId === checkoutId);
  if (!isOwn || !checkoutId) return;
  const downloads = await fetchDownloads(ctx, checkoutId);
  if (downloads.status !== "ready") return;
  await sendFiles(ctx, user.telegramId, user.lang, downloads.items.filter((i) => i.id === productId));
}
