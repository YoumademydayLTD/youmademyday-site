// JSON responses and the request-body readers shared by every endpoint.
import { HttpError } from "./errors.ts";

const JSON_TYPE = "application/json; charset=utf-8";
export const MAX_BODY_BYTES = 64 * 1024;

export const json = (data: unknown, status = 200, headers: HeadersInit = {}): Response =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": JSON_TYPE, "Cache-Control": "no-store", ...Object.fromEntries(new Headers(headers)) } });

export const errorResponse = (error: HttpError, headers: HeadersInit = {}): Response =>
  json({ error: error.code, message: error.message }, error.status, headers);

/** The raw body as text, refusing anything over the limit. */
export async function readText(request: Request, maxBytes = MAX_BODY_BYTES): Promise<string> {
  const declared = Number(request.headers.get("Content-Length") ?? "0");
  if (declared > maxBytes) throw new HttpError("payload_too_large", `body over ${maxBytes} bytes`);
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maxBytes) throw new HttpError("payload_too_large", `body over ${maxBytes} bytes`);
  return text;
}

/** The body parsed as a JSON object (an empty body is an empty object). */
export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  const text = await readText(request);
  if (!text.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new HttpError("bad_request", "the body is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new HttpError("bad_request", "the body must be a JSON object");
  return parsed as Record<string, unknown>;
}

export function requireString(body: Record<string, unknown>, field: string, maxLength: number): string {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) throw new HttpError("bad_request", `${field} must be a non-empty string`);
  if (value.length > maxLength) throw new HttpError("bad_request", `${field} is longer than ${maxLength} characters`);
  return value.trim();
}

export function requireInteger(body: Record<string, unknown>, field: string, min: number, max: number): number {
  const value = body[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) throw new HttpError("bad_request", `${field} must be a whole number from ${min} to ${max}`);
  return value;
}
