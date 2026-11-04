// Upload every product PDF, per language, to the private R2 bucket the worker delivers downloads from.
// Keys are <lang>/<product id>.pdf. Hebrew files are content/dist/<NN>-*.pdf, others content/dist/<lang>/<NN>-*.pdf.
// Bundles have no file of their own: the worker delivers the books they include. Idempotent: a file whose
// SHA-256 matches worker/src/delivery/files.json is skipped. Run: node tools/upload_files.ts [--force]
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./polar/api.ts";
import { buildCatalog } from "./build_catalog.ts";
import { putObject } from "./r2.ts";

const DIST = join(ROOT, "content", "dist");
const WORKER = join(ROOT, "worker");
export const MANIFEST_PATH = join(WORKER, "src", "delivery", "files.json");
const SOURCE_LANG = "he"; // the Hebrew files sit directly in content/dist
const FILE_NUMBER_DIGITS = 2;
const isForced = process.argv.includes("--force");

export interface FileEntry { sha256: string; size: number; filename: string }
export type Manifest = Record<string, FileEntry>;

/** The PDF of product number n in a language, if it was built. */
export function sourceFile(lang: string, n: number): string | undefined {
  const dir = lang === SOURCE_LANG ? DIST : join(DIST, lang);
  if (!existsSync(dir)) return undefined;
  const prefix = `${String(n).padStart(FILE_NUMBER_DIGITS, "0")}-`;
  const name = readdirSync(dir).find((f) => f.startsWith(prefix) && f.endsWith(".pdf"));
  return name ? join(dir, name) : undefined;
}

/** "07-instagram-small-business.pdf" → "instagram-small-business.pdf": the name the buyer's download gets. */
export const cleanFilename = (path: string): string => (path.split("/").pop() ?? path).replace(/^\d+-/, "");

const readManifest = (): Manifest => (existsSync(MANIFEST_PATH) ? (JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Manifest) : {});
const writeManifest = (manifest: Manifest): void => {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 1)}\n`);
};

async function main(): Promise<void> {
  const catalog = await buildCatalog();
  const manifest = readManifest();
  const counts = { uploaded: 0, unchanged: 0, missing: 0 };
  for (const [id, product] of Object.entries(catalog.products)) {
    if (product.includes) continue; // bundles deliver their books
    for (const lang of catalog.langs) {
      const path = sourceFile(lang, product.n);
      if (!path) { counts.missing += 1; continue; }
      const bytes = readFileSync(path);
      const entry: FileEntry = { sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.byteLength, filename: cleanFilename(path) };
      const key = `${lang}/${id}.pdf`;
      if (!isForced && manifest[key]?.sha256 === entry.sha256) { counts.unchanged += 1; continue; }
      putObject(key, path, "application/pdf");
      manifest[key] = entry;
      writeManifest(manifest); // after every file, so an interrupted run resumes where it stopped
      counts.uploaded += 1;
      console.log(`uploaded ${key}`);
    }
  }
  writeManifest(manifest);
  console.log(`files: ${counts.uploaded} uploaded, ${counts.unchanged} unchanged, ${counts.missing} not built (language fallback covers them)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try { await main(); } catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
}
