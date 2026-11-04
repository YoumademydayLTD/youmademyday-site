// Sends an order's PDFs into the chat as documents, straight from the R2 bucket; when that fails, a message with
// the store's signed download links instead (they open the file on the site).
import type { AppContext } from "../app/context.ts";
import type { Lang } from "../config/langs.ts";
import { t } from "../i18n/index.ts";
import { link } from "../menu/keyboards.ts";
import { sendText } from "../telegram/send.ts";
import { fileKey, type DownloadItem } from "./store.ts";

async function sendDocument(ctx: AppContext, chatId: number, item: DownloadItem): Promise<void> {
  const object = await ctx.env.FILES.get(fileKey(item));
  if (!object) throw new Error(`R2 object missing: ${fileKey(item)}`);
  const form = new FormData();
  form.set("chat_id", String(chatId));
  form.set("caption", item.title);
  form.set("document", new File([await object.arrayBuffer()], item.filename, { type: "application/pdf" }));
  await ctx.tg.upload("sendDocument", form);
}

/** Returns the items that could not be sent as documents (already offered as links). */
export async function sendFiles(ctx: AppContext, chatId: number, lang: Lang, items: DownloadItem[]): Promise<DownloadItem[]> {
  const failed: DownloadItem[] = [];
  for (const item of items) {
    try {
      await sendDocument(ctx, chatId, item);
    } catch (error) {
      console.error("library: document failed", item.id, error instanceof Error ? error.message : String(error));
      failed.push(item);
    }
  }
  if (failed.length) {
    await sendText(ctx, chatId, t(lang, "orderLinks"), { keyboard: { inline_keyboard: failed.map((item) => [link(`📥 ${item.title}`, item.url)]) } });
  }
  return failed;
}
