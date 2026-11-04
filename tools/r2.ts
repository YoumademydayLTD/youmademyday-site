// Upload one file to the store's private R2 bucket with wrangler (the login in ~/Library/Preferences/.wrangler).
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { ROOT } from "./polar/api.ts";

export const BUCKET = "ymd-files";
const WORKER = join(ROOT, "worker");

export function putObject(key: string, path: string, contentType: string): void {
  execFileSync("npx", ["wrangler", "r2", "object", "put", `${BUCKET}/${key}`, "--file", path, "--content-type", contentType, "--remote"],
    { cwd: WORKER, stdio: ["ignore", "ignore", "pipe"] });
}
