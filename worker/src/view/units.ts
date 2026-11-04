// The reader's index of lessons and chapters (written by tools/upload_reader.ts) and the language fallback (pure).
import data from "./index.json";
import { FALLBACK_LANGS } from "../delivery/items.ts";

export interface ViewUnit { n: number; title: string; minutes: number | null }
export interface ViewEntry { kind: "course" | "book"; units: ViewUnit[]; sha256: string }
export type ViewIndex = Record<string, ViewEntry>;

export const VIEW_INDEX = data as ViewIndex;

/** The item in the buyer's language, else English, else Hebrew; null when it has no readable version. */
export function findView(index: ViewIndex, productId: string, lang: string): (ViewEntry & { lang: string; key: string }) | null {
  for (const candidate of [...new Set([lang, ...FALLBACK_LANGS])]) {
    const entry = index[`${candidate}/${productId}`];
    if (entry) return { ...entry, lang: candidate, key: `view/${candidate}/${productId}.json` };
  }
  return null;
}
