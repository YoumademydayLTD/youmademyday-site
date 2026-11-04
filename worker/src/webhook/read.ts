// Safe readers for webhook payload fields (the payload is JSON we did not type ourselves).
export type Json = Record<string, unknown>;

export const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
export const str = (data: Json, key: string): string | null => (typeof data[key] === "string" ? (data[key] as string) : null);
export const num = (data: Json, key: string): number => (typeof data[key] === "number" ? (data[key] as number) : 0);
export const obj = (data: Json, key: string): Json => (isObject(data[key]) ? (data[key] as Json) : {});

/** Metadata values as strings (Polar allows strings, numbers and booleans). */
export function metadataOf(data: Json): Record<string, string> {
  return Object.fromEntries(Object.entries(obj(data, "metadata")).map(([k, v]) => [k, String(v)]));
}
