// What a queued message is. Texts are rendered at send time, in the user's language of that moment.
export type OutboxPayload =
  | { kind: "daily"; track: string; day: number }
  | { kind: "evening"; track: string; day: number }
  | { kind: "charge"; planId: string; periodEnd: string; amount: number; currency: string };

export interface OutboxItem { id: number; telegramId: number; payload: OutboxPayload; attempts: number }

export function parsePayload(text: string): OutboxPayload | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || !("kind" in value)) return null;
    return value as OutboxPayload;
  } catch {
    return null;
  }
}
