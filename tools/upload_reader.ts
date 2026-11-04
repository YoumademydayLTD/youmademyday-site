// Upload the site reader's lessons and chapters (content/view, built by tools/build_reader.py) to the private R2
// bucket as view/<lang>/<id>.json, and write worker/src/view/index.json: per item and language, its kind, units
// (title, minutes) and the uploaded file's hash. Idempotent: an unchanged file is skipped. Run: node tools/upload_reader.ts [--force]
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./polar/api.ts";
import { putObject } from "./r2.ts";

const VIEW = join(ROOT, "content", "view");
export const VIEW_INDEX_PATH = join(ROOT, "worker", "src", "view", "index.json");
const isForced = process.argv.includes("--force");

export interface ViewUnit { n: number; title: string; minutes: number | null }
export interface ViewEntry { kind: "course" | "book"; units: ViewUnit[]; sha256: string }
type BuiltIndex = Record<string, { kind: "course" | "book"; units: ViewUnit[] }>;

const readJson = <T>(path: string, fallback: T): T => (existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : fallback);
const writeIndex = (index: Record<string, ViewEntry>): void => {
  writeFileSync(VIEW_INDEX_PATH, `${JSON.stringify(Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b))))}\n`);
};

function main(): void {
  const built = readJson<BuiltIndex>(join(VIEW, "index.json"), {});
  if (!Object.keys(built).length) throw new Error("content/view/index.json is missing: run tools/.venv/bin/python tools/build_reader.py first");
  const index = readJson<Record<string, ViewEntry>>(VIEW_INDEX_PATH, {});
  const counts = { uploaded: 0, unchanged: 0 };
  for (const [key, item] of Object.entries(built)) {
    const path = join(VIEW, `${key}.json`);
    const sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
    if (!isForced && index[key]?.sha256 === sha256) {
      index[key] = { ...item, sha256 }; // titles can change without the bodies changing
      counts.unchanged += 1;
      continue;
    }
    putObject(`view/${key}.json`, path, "application/json");
    index[key] = { ...item, sha256 };
    writeIndex(index); // after every file, so an interrupted run resumes where it stopped
    counts.uploaded += 1;
    console.log(`uploaded view/${key}.json`);
  }
  for (const key of Object.keys(index)) if (!built[key]) delete index[key];
  writeIndex(index);
  console.log(`reader: ${counts.uploaded} uploaded, ${counts.unchanged} unchanged → worker/src/view/index.json`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
