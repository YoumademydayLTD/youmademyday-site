// Reads and extends Site/.env.bot (gitignored) without ever printing a value.
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

export const ENV_FILE = new URL("../../.env.bot", import.meta.url);

export function readEnv(): Record<string, string> {
  const lines = readFileSync(ENV_FILE, "utf8").split("\n");
  return Object.fromEntries(lines.filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
}

/** Adds NAME=<random> when the file has no such line yet. Returns whether it was created. */
export function ensureSecret(name: string, bytes: number): boolean {
  if (readEnv()[name]) return false;
  appendFileSync(ENV_FILE, `${name}=${randomBytes(bytes).toString("base64url")}\n`, { mode: 0o600 });
  return true;
}
