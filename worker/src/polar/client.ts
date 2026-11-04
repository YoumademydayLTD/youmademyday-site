// Calls to the Polar API from the worker. Errors keep Polar's own detail for logs and server callers.
import type { PolarCheckoutBody } from "./checkout-body.ts";

export interface PolarCheckout { id: string; url: string; status: string; expires_at: string; total_amount: number; currency: string }
export interface PolarConfig { apiBase: string; token: string; fetcher?: typeof fetch }

const DETAIL_CHARS = 500;
export const HTTP_NOT_FOUND = 404;

export class PolarApiError extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(status: number, detail: string) {
    super(`Polar answered ${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
  }
}

/** One Polar API call; resolves the parsed JSON (null for an empty reply), throws PolarApiError otherwise. */
export async function polarRequest<T>(config: PolarConfig, method: string, path: string, body?: unknown): Promise<T> {
  const fetcher = config.fetcher ?? fetch;
  let response: Response;
  try {
    response = await fetcher(`${config.apiBase}${path}`, {
      method,
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", Accept: "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    throw new PolarApiError(0, `network error: ${error instanceof Error ? error.message : String(error)}`);
  }
  const text = await response.text();
  if (!response.ok) throw new PolarApiError(response.status, text.slice(0, DETAIL_CHARS));
  return (text ? JSON.parse(text) : null) as T;
}

export const createCheckout = (config: PolarConfig, body: PolarCheckoutBody): Promise<PolarCheckout> =>
  polarRequest<PolarCheckout>(config, "POST", "/checkouts/", body);

export const polarConfig = (env: { POLAR_API: string; POLAR_ACCESS_TOKEN: string }): PolarConfig => ({ apiBase: env.POLAR_API, token: env.POLAR_ACCESS_TOKEN });
