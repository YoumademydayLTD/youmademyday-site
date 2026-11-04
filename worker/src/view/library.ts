// Library entries for the personal area: the download plus what the reader needs (pure).
import type { Catalog } from "../catalog/index.ts";
import type { DownloadItem } from "../delivery/downloads.ts";
import { findView, type ViewIndex } from "./units.ts";

export interface LibraryItem extends DownloadItem {
  kind: "course" | "book";
  readable: boolean;
  viaPlan: boolean;
  progress: { done: number; total: number } | null;
}

export function libraryItem(item: DownloadItem, context: { catalog: Catalog; index: ViewIndex; lang: string; viaPlan: Set<string>; done: Map<string, number> }): LibraryItem {
  const view = findView(context.index, item.id, context.lang);
  const kind = context.catalog.products[item.id]?.type === "course" ? "course" : "book";
  return {
    ...item, kind, readable: view !== null, viaPlan: context.viaPlan.has(item.id),
    progress: view ? { done: Math.min(context.done.get(item.id) ?? 0, view.units.length), total: view.units.length } : null,
  };
}
