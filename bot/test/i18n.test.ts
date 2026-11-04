import { describe, expect, it } from "vitest";
import { COPY, PROFILES, t } from "../src/i18n/index.ts";
import { LANGS } from "../src/config/langs.ts";
import { ZONES } from "../src/config/zones.ts";
import { commandsFor } from "../src/telegram/commands.ts";

// Bot API limits: name 64, description 512, short description 120, command description 256.
const LIMITS = { name: 64, description: 512, short: 120, command: 256 };
const PLACEHOLDER = /\{(\w+)\}/g;
const placeholders = (text: string) => [...text.matchAll(PLACEHOLDER)].map((m) => m[1]).sort();

describe("bot texts", () => {
  it("has the same keys and placeholders in every language", () => {
    for (const lang of LANGS) {
      expect(Object.keys(COPY[lang]).sort()).toEqual(Object.keys(COPY.he).sort());
      for (const [key, value] of Object.entries(COPY.he)) {
        if (typeof value === "string") expect(placeholders(COPY[lang][key as keyof typeof COPY.he] as string), `${lang}.${key}`).toEqual(placeholders(value));
      }
      expect(Object.keys(COPY[lang].zones).sort()).toEqual([...ZONES].sort());
    }
  });

  it("fits Telegram's profile limits", () => {
    for (const lang of LANGS) {
      const p = PROFILES[lang];
      expect(p.name.length).toBeLessThanOrEqual(LIMITS.name);
      expect(p.description.length).toBeLessThanOrEqual(LIMITS.description);
      expect(p.shortDescription.length).toBeLessThanOrEqual(LIMITS.short);
      for (const c of commandsFor(lang)) expect(c.description.length).toBeLessThanOrEqual(LIMITS.command);
    }
  });

  it("never names the payment provider", () => {
    const all = JSON.stringify([COPY, PROFILES]).toLowerCase();
    for (const word of ["polar", "stripe", "paddle"]) expect(all).not.toContain(word);
  });

  it("fills placeholders and keeps unknown ones", () => {
    expect(t("en", "doneStreak", { n: 3 })).toBe("Noted ✓ 3 days in a row 🔥");
    expect(t("he", "loginCode")).toContain("{code}");
  });
});
