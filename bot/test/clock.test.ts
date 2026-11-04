import { describe, expect, it } from "vitest";
import { eveningSendAt, isDailyDue, localTime, previousDate } from "../src/daily/clock.ts";
import { recordDone } from "../src/daily/streak.ts";
import { unixSeconds } from "../src/config/time.ts";

const schedule = (over: Partial<Parameters<typeof isDailyDue>[0]> = {}) =>
  ({ timeZone: "Asia/Jerusalem", dailyHour: 8, lastDailyDate: null, isPaused: false, ...over });

describe("local time", () => {
  it("reads the wall clock of each zone", () => {
    const now = new Date("2026-11-04T05:30:00Z");
    expect(localTime(now, "Asia/Jerusalem")).toEqual({ date: "2026-11-04", hour: 7, minute: 30 }); // UTC+2 in winter
    expect(localTime(now, "America/New_York")).toEqual({ date: "2026-11-04", hour: 0, minute: 30 });
    expect(localTime(now, "America/Los_Angeles")).toEqual({ date: "2026-11-03", hour: 21, minute: 30 });
  });

  it("follows daylight saving time", () => {
    expect(localTime(new Date("2026-07-01T05:00:00Z"), "Asia/Jerusalem").hour).toBe(8); // UTC+3 in summer
    expect(localTime(new Date("2026-01-01T05:00:00Z"), "Asia/Jerusalem").hour).toBe(7);
  });
});

describe("daily due time", () => {
  it("is due from the chosen local hour, once per local day", () => {
    expect(isDailyDue(schedule(), new Date("2026-11-04T05:45:00Z"))).toBe(false); // 07:45 in Jerusalem
    expect(isDailyDue(schedule(), new Date("2026-11-04T06:00:00Z"))).toBe(true); // 08:00
    expect(isDailyDue(schedule({ lastDailyDate: "2026-11-04" }), new Date("2026-11-04T10:00:00Z"))).toBe(false);
    expect(isDailyDue(schedule({ lastDailyDate: "2026-11-03" }), new Date("2026-11-04T10:00:00Z"))).toBe(true);
  });

  it("uses the user's zone, not UTC", () => {
    const now = new Date("2026-11-04T13:00:00Z"); // 08:00 in New York, 15:00 in Jerusalem
    expect(isDailyDue(schedule({ timeZone: "America/New_York" }), now)).toBe(true);
    expect(isDailyDue(schedule({ timeZone: "America/Los_Angeles" }), now)).toBe(false); // 05:00
  });

  it("counts the local date across midnight", () => {
    // 23:30 UTC on the 3rd is 01:30 on the 4th in Jerusalem: a new local day, but before 8.
    const now = new Date("2026-11-03T23:30:00Z");
    expect(isDailyDue(schedule({ dailyHour: 1, lastDailyDate: "2026-11-03" }), now)).toBe(true);
  });

  it("never sends while paused", () => {
    expect(isDailyDue(schedule({ isPaused: true }), new Date("2026-11-04T10:00:00Z"))).toBe(false);
  });
});

describe("evening reminder", () => {
  it("lands at the evening hour local time", () => {
    const now = new Date("2026-11-04T06:12:40Z"); // 08:12:40 in Jerusalem
    expect(new Date(eveningSendAt(now, "Asia/Jerusalem", 20, 2) * 1000).toISOString()).toBe("2026-11-04T18:00:00.000Z");
  });

  it("comes a little later when the evening has begun", () => {
    const now = new Date("2026-11-04T19:00:00Z"); // 21:00 in Jerusalem
    expect(eveningSendAt(now, "Asia/Jerusalem", 20, 2)).toBe(unixSeconds(now) + 2 * 3600);
  });
});

describe("streak", () => {
  it("grows on consecutive days and restarts after a gap", () => {
    expect(previousDate("2026-03-01")).toBe("2026-02-28");
    let s = recordDone({ streak: 0, lastDoneDate: null }, "2026-11-01");
    expect(s.streak).toBe(1);
    s = recordDone(s, "2026-11-02");
    expect(s.streak).toBe(2);
    expect(recordDone(s, "2026-11-02")).toMatchObject({ streak: 2, isNew: false });
    expect(recordDone(s, "2026-11-05").streak).toBe(1);
  });
});
