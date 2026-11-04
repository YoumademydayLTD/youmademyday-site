import { describe, expect, it } from "vitest";
import { HISTORY_DAYS, historyDays, parseSettings, todayDay, trackChoices } from "../src/companion/view.ts";

describe("companion days", () => {
  it("shows the last day the bot sent, or day 1 for a new member", () => {
    expect(todayDay({ track: "spark", trackDay: 5, lastDailyDate: "2026-11-04" })).toBe(4);
    expect(todayDay({ track: "spark", trackDay: 1, lastDailyDate: null })).toBe(1);
    expect(todayDay({ track: null, trackDay: 3, lastDailyDate: "2026-11-04" })).toBeNull();
  });
  it("lists past days newest first, up to the history limit", () => {
    expect(historyDays(4)).toEqual([3, 2, 1]);
    expect(historyDays(1)).toEqual([]);
    expect(historyDays(null)).toEqual([]);
    expect(historyDays(HISTORY_DAYS + 10)).toHaveLength(HISTORY_DAYS);
  });
});

describe("companion settings and tracks", () => {
  it("accepts an hour 0–23 and true/false switches only", () => {
    expect(parseSettings({ dailyHour: 7, paused: true, silent: false })).toEqual({ dailyHour: 7, dailyPaused: true, dailySilent: false });
    expect(parseSettings({})).toEqual({});
    expect(parseSettings({ dailyHour: 24 })).toBeNull();
    expect(parseSettings({ dailyHour: 7.5 })).toBeNull();
    expect(parseSettings({ paused: "yes" })).toBeNull();
  });
  it("lets everyone join Spark and members the topic tracks", () => {
    const visitor = trackChoices([]);
    expect(visitor.find((t) => t.id === "spark")).toEqual({ id: "spark", isFree: true, canJoin: true });
    expect(visitor.find((t) => t.id === "calm")?.canJoin).toBe(false);
    expect(trackChoices(["grow"]).every((t) => t.canJoin)).toBe(true);
  });
});
