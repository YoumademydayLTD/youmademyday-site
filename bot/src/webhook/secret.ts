// Telegram signs each webhook call with the secret_token we set: X-Telegram-Bot-Api-Secret-Token.
import { timingSafeEqualText } from "../http/crypto.ts";

export const SECRET_HEADER = "X-Telegram-Bot-Api-Secret-Token";

export function isWebhookAuthentic(headers: Headers, secret: string): boolean {
  const given = headers.get(SECRET_HEADER);
  return Boolean(secret) && given !== null && timingSafeEqualText(given, secret);
}
