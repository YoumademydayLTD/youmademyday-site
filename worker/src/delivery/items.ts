// Which files an order delivers, in which language (pure). Shared by the thanks page and, later, the Telegram bot.
import type { Catalog } from "../catalog/index.ts";
import type { FileManifest } from "./manifest.ts";

// Owner, 04.11.2026: a file missing in the buyer's language comes in English, then in Hebrew.
export const FALLBACK_LANGS = ["en", "he"] as const;

/** The products whose files an order delivers: bundles become the books they include; unknown ids are dropped. */
export function deliverableIds(itemIds: string[], catalog: Catalog): string[] {
  const ids = itemIds.flatMap((id) => catalog.products[id]?.includes ?? [id]);
  return [...new Set(ids)].filter((id) => catalog.products[id] && !catalog.products[id]?.includes);
}

/** The stored file for a product in the buyer's language, or the first fallback that exists. */
export function pickFile(productId: string, lang: string, manifest: FileManifest): { key: string; lang: string; filename: string; size: number } | null {
  for (const candidate of [...new Set([lang, ...FALLBACK_LANGS])]) {
    const key = `${candidate}/${productId}.pdf`;
    const entry = manifest[key];
    if (entry) return { key, lang: candidate, filename: entry.filename, size: entry.size };
  }
  return null;
}

/** The product's title on the buyer's site, else English, else the Hebrew source title. */
export function titleFor(productId: string, lang: string, catalog: Catalog): string {
  const product = catalog.products[productId];
  if (!product) return productId;
  return product.titles[lang] ?? product.titles.en ?? product.title;
}
