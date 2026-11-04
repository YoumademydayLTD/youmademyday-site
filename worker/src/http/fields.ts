// Small typed readers for request fields; each throws a clear bad_request naming the field.
import { HttpError } from "./errors.ts";

export function requireString(body: Record<string, unknown>, field: string, maxLength: number): string {
  const value = body[field];
  if (typeof value !== "string" || !value.trim()) throw new HttpError("bad_request", `${field} must be a non-empty string`);
  if (value.length > maxLength) throw new HttpError("bad_request", `${field} is longer than ${maxLength} characters`);
  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string, maxLength: number): string | undefined {
  return body[field] === undefined || body[field] === null ? undefined : requireString(body, field, maxLength);
}

export function requireOneOf<T extends string>(body: Record<string, unknown>, field: string, allowed: readonly T[]): T {
  const value = body[field];
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) throw new HttpError("bad_request", `${field} must be one of: ${allowed.join(", ")}`);
  return value as T;
}

export function requireStringList(body: Record<string, unknown>, field: string, maxItems: number, maxLength: number): string[] {
  const value = body[field];
  if (!Array.isArray(value) || value.length === 0) throw new HttpError("bad_request", `${field} must be a non-empty array`);
  if (value.length > maxItems) throw new HttpError("bad_request", `${field} has more than ${maxItems} items`);
  return value.map((item, i) => {
    if (typeof item !== "string" || !item || item.length > maxLength) throw new HttpError("bad_request", `${field}[${i}] must be a short string`);
    return item;
  });
}
