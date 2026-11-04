// Minimal Polar API client for the maintenance scripts in tools/ (product sync, webhook setup).
// The token is read from the environment or from Site/.env and never printed.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const POLAR_API = "https://api.polar.sh/v1";
const ENV_FILE = join(ROOT, ".env");
const HTTP_FORBIDDEN = 403;
const ERROR_BODY_CHARS = 600;

/** One value from the environment, falling back to the gitignored Site/.env file. */
export function secret(name: string): string {
  const fromEnv = process.env[name];
  if (fromEnv) return fromEnv;
  if (existsSync(ENV_FILE)) {
    for (const line of readFileSync(ENV_FILE, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match?.[1] === name && match[2]) return match[2].replace(/^["']|["']$/g, "");
    }
  }
  throw new Error(`${name} is missing: set it in the environment or in Site/.env`);
}

export class PolarError extends Error {
  readonly status: number;
  readonly body: string;
  readonly path: string;
  constructor(status: number, body: string, path: string) {
    super(`Polar ${status} on ${path}: ${body.slice(0, ERROR_BODY_CHARS)}`);
    this.status = status;
    this.body = body;
    this.path = path;
  }
  get isMissingScope(): boolean { return this.status === HTTP_FORBIDDEN; }
}

/** Call the Polar API with the organization token; throws PolarError on any non-2xx reply. */
export async function polar<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${POLAR_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret("POLAR_ACCESS_TOKEN")}`, "Content-Type": "application/json", Accept: "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok) throw new PolarError(response.status, text, `${method} ${path}`);
  return (text ? JSON.parse(text) : null) as T;
}

interface Page<T> { items: T[]; pagination: { total_count: number; max_page: number } }

/** Every item of a paginated list endpoint. */
export async function listAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  const separator = path.includes("?") ? "&" : "?";
  for (let page = 1; ; page += 1) {
    const result = await polar<Page<T>>("GET", `${path}${separator}limit=100&page=${page}`);
    items.push(...result.items);
    if (page >= result.pagination.max_page) return items;
  }
}
