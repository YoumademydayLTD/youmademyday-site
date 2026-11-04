// The rules for the topic tracks' daily messages (pure, no I/O): how a source file looks, what a valid message
// is, and how a message becomes one idempotent upsert into bot_content. Used by tools/build_track_content.ts.
import { LANGS, type Lang } from "../../src/config/langs.ts";

/** One day in a source file: the message as lines, joined with line breaks when it is stored. */
export interface DayEntry { day: number; lines: string[] }

export interface TrackSpec { id: string; days: number }

export interface ContentRow { track: string; dayN: number; lang: Lang; text: string }

// Owner brief, 04.11.2026: 40–110 words a message, counted by whitespace in every language.
export const MIN_WORDS = 40;
export const MAX_WORDS = 110;
// Telegram allows 4096 characters; the evening resend prepends a short lead, so stay far below.
export const MAX_CHARS = 1500;
// The bot sends with parse_mode HTML and the site escapes the same text, so markup characters are never allowed.
const MARKUP_CHARS = /[<>&]/;
const HEBREW_SCRIPT = /[֐-׿]/;
// The day label is the second line of every message, e.g. «יום 3 מתוך 30 · …».
const DAY_LABEL_LINE = 1;

const DAY_LABELS: Record<Lang, (day: number, total: number) => string> = {
  he: (d, n) => `יום ${d} מתוך ${n}`,
  en: (d, n) => `Day ${d} of ${n}`,
  fr: (d, n) => `Jour ${d} sur ${n}`,
  ar: (d, n) => `اليوم ${d} من ${n}`,
  ru: (d, n) => `День ${d} из ${n}`,
};

export const dayLabel = (lang: Lang, day: number, total: number): string => DAY_LABELS[lang](day, total);

// Day 1 of these tracks must point to a qualified professional (owner brief: money is not financial advice,
// calm is not treatment). The check looks for the word in each language.
const SAFETY_WORDS: Record<Lang, RegExp> = {
  he: /איש מקצוע|אנשי מקצוע/,
  en: /professional/i,
  fr: /professionnel/i,
  ar: /مختص|متخصص/,
  ru: /специалист/i,
};
export const SAFETY_TRACKS: readonly string[] = ["money", "calm"];

export const countWords = (text: string): number => text.split(/\s+/).filter(Boolean).length;
export const messageText = (entry: DayEntry): string => entry.lines.join("\n");

const isDayEntry = (value: unknown): value is DayEntry => {
  if (typeof value !== "object" || value === null) return false;
  const { day, lines } = value as { day?: unknown; lines?: unknown };
  return Number.isInteger(day) && Array.isArray(lines) && lines.every((line) => typeof line === "string");
};

/** The days of a parsed source file, or the reason it is not one. */
export function parseDays(json: unknown): { days: DayEntry[] } | { error: string } {
  if (!Array.isArray(json)) return { error: "the file must be a JSON array of {day, lines}" };
  const bad = json.findIndex((entry) => !isDayEntry(entry));
  return bad === -1 ? { days: json as DayEntry[] } : { error: `entry ${bad + 1} is not {day: integer, lines: string[]}` };
}

function messageProblems(spec: TrackSpec, lang: Lang, entry: DayEntry): string[] {
  const text = messageText(entry);
  const words = countWords(text);
  const problems: string[] = [];
  if (!text.trim() || entry.lines.some((line, i) => i <= DAY_LABEL_LINE && !line.trim())) problems.push("empty greeting or day label");
  if (words < MIN_WORDS || words > MAX_WORDS) problems.push(`${words} words (allowed ${MIN_WORDS}–${MAX_WORDS})`);
  if (text.length > MAX_CHARS) problems.push(`${text.length} characters (max ${MAX_CHARS})`);
  if (MARKUP_CHARS.test(text)) problems.push("contains <, > or &");
  if (lang !== "he" && HEBREW_SCRIPT.test(text)) problems.push("Hebrew letters in a non-Hebrew message");
  if (!(entry.lines[DAY_LABEL_LINE] ?? "").startsWith(dayLabel(lang, entry.day, spec.days))) problems.push(`line 2 must start with «${dayLabel(lang, entry.day, spec.days)}»`);
  if (entry.day === 1 && SAFETY_TRACKS.includes(spec.id) && !SAFETY_WORDS[lang].test(text)) problems.push("day 1 needs the line about a qualified professional");
  return problems;
}

/** Every problem of one track in one language: missing, extra or repeated days and invalid messages. */
export function validateTrack(spec: TrackSpec, lang: Lang, days: readonly DayEntry[]): string[] {
  const where = (day: number | string): string => `${spec.id}/${lang} day ${day}`;
  const seen = new Set<number>();
  const problems: string[] = [];
  for (const entry of days) {
    if (seen.has(entry.day)) problems.push(`${where(entry.day)}: repeated`);
    seen.add(entry.day);
    if (entry.day < 1 || entry.day > spec.days) problems.push(`${where(entry.day)}: outside 1–${spec.days}`);
    else problems.push(...messageProblems(spec, lang, entry).map((p) => `${where(entry.day)}: ${p}`));
  }
  for (let day = 1; day <= spec.days; day++) if (!seen.has(day)) problems.push(`${where(day)}: missing`);
  return problems;
}

/** A SQL string literal; line breaks become char(10) like the Spark seed, so every statement stays on one line. */
export function sqlText(value: string): string {
  return value.split("\n").map((line) => `'${line.replaceAll("'", "''")}'`).join(" || char(10) || ");
}

/** One upsert: re-running it leaves a single row per track, day and language with this text. */
export function upsertSql(row: ContentRow, now: string): string {
  return "INSERT INTO bot_content (track, day_n, lang, text, lesson_url, lesson_label, updated_at) VALUES ("
    + `${sqlText(row.track)}, ${row.dayN}, ${sqlText(row.lang)}, ${sqlText(row.text)}, NULL, NULL, ${sqlText(now)}) `
    + "ON CONFLICT(track, day_n, lang) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at;";
}

export const ALL_LANGS: readonly Lang[] = LANGS;
