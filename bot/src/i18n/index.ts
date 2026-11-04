// The bot's texts: t(lang, key, vars) with {name} placeholders. Values put into texts are HTML-escaped by the
// caller (messages go out with parse_mode HTML).
import type { Lang } from "../config/langs.ts";
import type { Copy, Profile } from "./types.ts";
import { he, heProfile } from "./he.ts";
import { en, enProfile } from "./en.ts";
import { fr, frProfile } from "./fr.ts";
import { ar, arProfile } from "./ar.ts";
import { ru, ruProfile } from "./ru.ts";

export const COPY: Record<Lang, Copy> = { he, en, fr, ar, ru };
export const PROFILES: Record<Lang, Profile> = { he: heProfile, en: enProfile, fr: frProfile, ar: arProfile, ru: ruProfile };

type TextKey = { [K in keyof Copy]: Copy[K] extends string ? K : never }[keyof Copy];

export function t(lang: Lang, key: TextKey, vars: Record<string, string | number> = {}): string {
  return COPY[lang][key].replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/** Escapes text for Telegram's HTML parse mode. */
export const escapeHtml = (text: string): string => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const zoneName = (lang: Lang, zone: string): string => COPY[lang].zones[zone] ?? zone;
export const planName = (lang: Lang, planId: string): string => COPY[lang].planNames[planId] ?? planId;
export type { Copy, Profile, TextKey };
