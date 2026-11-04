import { describe, expect, it } from "vitest";
import { countWords, dayLabel, parseDays, sqlText, upsertSql, validateTrack, type DayEntry } from "../tools/track-content/rules.ts";

const FILLER = Array.from({ length: 45 }, (_, i) => `word${i}`).join(" ");
const entry = (day: number, total: number, body = FILLER): DayEntry => ({ day, lines: ["Good morning", `${dayLabel("en", day, total)} · Start`, body] });
const spec = { id: "habits", days: 3 };

describe("track messages", () => {
  it("counts words by whitespace in any script", () => {
    expect(countWords("  בוקר   טוב\nיום 1 ")).toBe(4);
    expect(countWords("")).toBe(0);
  });
  it("accepts a complete track", () => {
    expect(validateTrack(spec, "en", [entry(1, 3), entry(2, 3), entry(3, 3)])).toEqual([]);
  });
  it("reports missing, repeated and out-of-range days", () => {
    const problems = validateTrack(spec, "en", [entry(1, 3), entry(1, 3), entry(4, 3)]);
    expect(problems).toContain("habits/en day 1: repeated");
    expect(problems).toContain("habits/en day 4: outside 1–3");
    expect(problems).toContain("habits/en day 2: missing");
    expect(problems).toContain("habits/en day 3: missing");
  });
  it("rejects short, long, markup and a wrong day label", () => {
    const [short] = validateTrack({ id: "habits", days: 1 }, "en", [entry(1, 1, "too short")]);
    expect(short).toMatch(/words/);
    expect(validateTrack({ id: "habits", days: 1 }, "en", [entry(1, 1, `${FILLER} ${FILLER} ${FILLER}`)])[0]).toMatch(/words/);
    expect(validateTrack({ id: "habits", days: 1 }, "en", [entry(1, 1, `${FILLER} a & b`)])).toEqual(["habits/en day 1: contains <, > or &"]);
    expect(validateTrack({ id: "habits", days: 1 }, "en", [entry(1, 2)])[0]).toMatch(/line 2 must start with «Day 1 of 1»/);
  });
  it("rejects Hebrew letters outside the Hebrew files", () => {
    expect(validateTrack({ id: "habits", days: 1 }, "en", [entry(1, 1, `${FILLER} שלום`)])).toEqual(["habits/en day 1: Hebrew letters in a non-Hebrew message"]);
  });
  it("asks money and calm for the professional line on day 1 only", () => {
    expect(validateTrack({ id: "money", days: 2 }, "en", [entry(1, 2), entry(2, 2)])).toEqual(["money/en day 1: day 1 needs the line about a qualified professional"]);
    expect(validateTrack({ id: "calm", days: 1 }, "en", [entry(1, 1, `${FILLER} talk to a professional`)])).toEqual([]);
  });
  it("parses only arrays of {day, lines}", () => {
    expect(parseDays([{ day: 1, lines: ["a"] }])).toEqual({ days: [{ day: 1, lines: ["a"] }] });
    expect(parseDays({})).toHaveProperty("error");
    expect(parseDays([{ day: "1", lines: ["a"] }])).toEqual({ error: "entry 1 is not {day: integer, lines: string[]}" });
  });
});

describe("track SQL", () => {
  it("quotes apostrophes and keeps line breaks as char(10)", () => {
    expect(sqlText("it's\nok")).toBe("'it''s' || char(10) || 'ok'");
  });
  it("writes one upsert per message", () => {
    const sql = upsertSql({ track: "calm", dayN: 2, lang: "fr", text: "Bonjour\nl'air" }, "2026-11-04T00:00:00Z");
    expect(sql).toBe("INSERT INTO bot_content (track, day_n, lang, text, lesson_url, lesson_label, updated_at) VALUES ('calm', 2, 'fr', "
      + "'Bonjour' || char(10) || 'l''air', NULL, NULL, '2026-11-04T00:00:00Z') ON CONFLICT(track, day_n, lang) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at;");
  });
});
